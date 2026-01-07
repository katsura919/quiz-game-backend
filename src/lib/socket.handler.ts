import { Server as SocketIOServer } from "socket.io";
import { FastifyInstance } from "fastify";
import { gameManager } from "./gameManager";
import { IPlayer } from "../types/player.types";

export function setupSocketIO(fastify: FastifyInstance) {
    const io = new SocketIOServer(fastify.server, {
        cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:3001",
            methods: ["GET", "POST"],
        },
    });

    // Track answered players per room
    const roomAnswers = new Map<string, Set<string>>();
    // Track active timers per room
    const roomTimers = new Map<string, NodeJS.Timeout>();

    io.on("connection", (socket) => {
        console.log("Client connected:", socket.id);

        // Create game room
        socket.on(
            "create-game",
            async (data: { hostId: string; questions: any[] }) => {
                try {
                    const game = await gameManager.createGame(
                        data.hostId,
                        data.questions
                    );
                    socket.join(game.roomCode);
                    socket.emit("game-created", {
                        roomCode: game.roomCode,
                        game,
                    });
                } catch (error) {
                    socket.emit("error", { message: "Failed to create game" });
                }
            }
        );

        // Join game room
        socket.on(
            "join-game",
            async (data: { roomCode: string; player: IPlayer }) => {
                try {
                    const game = await gameManager.addPlayer(
                        data.roomCode,
                        data.player
                    );

                    if (!game) {
                        socket.emit("error", {
                            message: "Game not found or already started",
                        });
                        return;
                    }

                    socket.join(data.roomCode);

                    // Notify player they joined
                    socket.emit("joined-game", { game });

                    // Notify all players in the room
                    io.to(data.roomCode).emit("player-joined", {
                        player: data.player,
                        players: game.players,
                    });
                } catch (error) {
                    socket.emit("error", { message: "Failed to join game" });
                }
            }
        );

        // Leave game
        socket.on(
            "leave-game",
            async (data: { roomCode: string; playerId: string }) => {
                try {
                    const game = await gameManager.removePlayer(
                        data.roomCode,
                        data.playerId
                    );

                    if (game) {
                        socket.leave(data.roomCode);
                        io.to(data.roomCode).emit("player-left", {
                            playerId: data.playerId,
                            players: game.players,
                        });
                    }
                } catch (error) {
                    console.error("Error leaving game:", error);
                }
            }
        );

        // Start game
        socket.on("start-game", async (data: { roomCode: string }) => {
            try {
                const game = await gameManager.startGame(data.roomCode);

                if (!game) {
                    socket.emit("error", { message: "Cannot start game" });
                    return;
                }

                // Initialize room answers tracker
                roomAnswers.set(data.roomCode, new Set());

                // Send first question to all players
                const question = game.questions[0];
                const questionData = {
                    id: question.id,
                    question: question.question,
                    answers: question.answers,
                    timeLimit: question.timeLimit,
                    questionNumber: 1,
                    totalQuestions: game.questions.length,
                };

                io.to(data.roomCode).emit("game-started", {
                    game,
                    question: questionData,
                });

                // Set timer to auto-advance after timeout
                const timer = setTimeout(async () => {
                    await advanceToNextQuestion(data.roomCode);
                }, question.timeLimit * 1000);

                roomTimers.set(data.roomCode, timer);
            } catch (error) {
                socket.emit("error", { message: "Failed to start game" });
            }
        });

        // Helper function to advance to next question
        async function advanceToNextQuestion(roomCode: string) {
            // Clear timer
            const timer = roomTimers.get(roomCode);
            if (timer) {
                clearTimeout(timer);
                roomTimers.delete(roomCode);
            }

            // Clear answered players for this question
            roomAnswers.set(roomCode, new Set());

            const game = await gameManager.nextQuestion(roomCode);

            if (!game || game.status === "finished") {
                const leaderboard = await gameManager.getLeaderboard(roomCode);
                io.to(roomCode).emit("game-finished", { leaderboard });
                roomAnswers.delete(roomCode);
                return;
            }

            const question = game.questions[game.currentQuestionIndex];
            const questionData = {
                id: question.id,
                question: question.question,
                answers: question.answers,
                timeLimit: question.timeLimit,
                questionNumber: game.currentQuestionIndex + 1,
                totalQuestions: game.questions.length,
            };

            // Wait 3 seconds before showing next question
            setTimeout(() => {
                io.to(roomCode).emit("next-question", {
                    question: questionData,
                });

                // Set timer for next question
                const newTimer = setTimeout(async () => {
                    await advanceToNextQuestion(roomCode);
                }, question.timeLimit * 1000);

                roomTimers.set(roomCode, newTimer);
            }, 3000);
        }

        // Submit answer
        socket.on(
            "submit-answer",
            async (data: {
                roomCode: string;
                playerId: string;
                answerIndex: number;
                timeElapsed?: number;
            }) => {
                try {
                    const result = await gameManager.submitAnswer(
                        data.roomCode,
                        data.playerId,
                        data.answerIndex,
                        data.timeElapsed || 0
                    );

                    if (!result) {
                        socket.emit("error", {
                            message: "Failed to submit answer",
                        });
                        return;
                    }

                    // Send feedback to player
                    socket.emit("answer-result", {
                        correct: result.correct,
                        points: result.points,
                    });

                    // Track answered player
                    const answered =
                        roomAnswers.get(data.roomCode) || new Set();
                    answered.add(data.playerId);
                    roomAnswers.set(data.roomCode, answered);

                    // Check if all players have answered
                    const game = await gameManager.getGame(data.roomCode);
                    if (game && answered.size >= game.players.length) {
                        console.log(
                            "All players answered, advancing immediately"
                        );
                        // All players answered, advance immediately
                        await advanceToNextQuestion(data.roomCode);
                    }
                } catch (error) {
                    socket.emit("error", {
                        message: "Failed to submit answer",
                    });
                }
            }
        );

        // Next question
        socket.on("next-question", async (data: { roomCode: string }) => {
            try {
                const game = await gameManager.nextQuestion(data.roomCode);

                if (!game) {
                    socket.emit("error", {
                        message: "Failed to move to next question",
                    });
                    return;
                }

                if (game.status === "finished") {
                    const leaderboard = await gameManager.getLeaderboard(
                        data.roomCode
                    );
                    io.to(data.roomCode).emit("game-finished", { leaderboard });
                    return;
                }

                const question = game.questions[game.currentQuestionIndex];
                const questionData = {
                    id: question.id,
                    question: question.question,
                    answers: question.answers,
                    timeLimit: question.timeLimit,
                    questionNumber: game.currentQuestionIndex + 1,
                    totalQuestions: game.questions.length,
                };

                io.to(data.roomCode).emit("next-question", {
                    question: questionData,
                });

                // Start timer
                setTimeout(() => {
                    io.to(data.roomCode).emit("question-timeout", {
                        correctAnswer: question.correctAnswer,
                    });
                }, question.timeLimit * 1000);
            } catch (error) {
                socket.emit("error", {
                    message: "Failed to get next question",
                });
            }
        });

        // Get leaderboard
        socket.on("get-leaderboard", async (data: { roomCode: string }) => {
            try {
                const leaderboard = await gameManager.getLeaderboard(
                    data.roomCode
                );
                socket.emit("leaderboard-update", { leaderboard });
            } catch (error) {
                socket.emit("error", { message: "Failed to get leaderboard" });
            }
        });

        // Get current question (for players who join mid-game or reload)
        socket.on(
            "get-current-question",
            async (data: { roomCode: string; playerId: string }) => {
                try {
                    const game = await gameManager.getGame(data.roomCode);

                    if (!game || game.status !== "playing") {
                        socket.emit("error", {
                            message: "Game not found or not started",
                        });
                        return;
                    }

                    const question = game.questions[game.currentQuestionIndex];
                    const questionData = {
                        id: question.id,
                        question: question.question,
                        answers: question.answers,
                        timeLimit: question.timeLimit,
                        correctAnswer: question.correctAnswer,
                        questionNumber: game.currentQuestionIndex + 1,
                        totalQuestions: game.questions.length,
                    };

                    socket.emit("current-question", { question: questionData });
                } catch (error) {
                    socket.emit("error", {
                        message: "Failed to get current question",
                    });
                }
            }
        );

        socket.on("disconnect", () => {
            console.log("Client disconnected:", socket.id);
        });
    });

    return io;
}
