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

                // Auto-advance to next question after timeout
                setTimeout(async () => {
                    io.to(data.roomCode).emit("question-timeout", {
                        correctAnswer: question.correctAnswer,
                    });

                    // Wait 3 seconds then move to next question
                    setTimeout(async () => {
                        const updatedGame = await gameManager.nextQuestion(
                            data.roomCode
                        );

                        if (!updatedGame || updatedGame.status === "finished") {
                            const leaderboard =
                                await gameManager.getLeaderboard(data.roomCode);
                            io.to(data.roomCode).emit("game-finished", {
                                leaderboard,
                            });
                            return;
                        }

                        const nextQuestion =
                            updatedGame.questions[
                                updatedGame.currentQuestionIndex
                            ];
                        const nextQuestionData = {
                            id: nextQuestion.id,
                            question: nextQuestion.question,
                            answers: nextQuestion.answers,
                            timeLimit: nextQuestion.timeLimit,
                            questionNumber:
                                updatedGame.currentQuestionIndex + 1,
                            totalQuestions: updatedGame.questions.length,
                        };

                        io.to(data.roomCode).emit("next-question", {
                            question: nextQuestionData,
                        });

                        // Auto-advance recursively
                        autoAdvanceQuestion(
                            data.roomCode,
                            nextQuestion.timeLimit
                        );
                    }, 3000);
                }, question.timeLimit * 1000);

                // Helper function for auto-advancing
                function autoAdvanceQuestion(
                    roomCode: string,
                    timeLimit: number
                ) {
                    setTimeout(
                        async () => {
                            const game =
                                await gameManager.nextQuestion(roomCode);

                            if (!game || game.status === "finished") {
                                const leaderboard =
                                    await gameManager.getLeaderboard(roomCode);
                                io.to(roomCode).emit("game-finished", {
                                    leaderboard,
                                });
                                return;
                            }

                            const nextQuestion =
                                game.questions[game.currentQuestionIndex];
                            const questionData = {
                                id: nextQuestion.id,
                                question: nextQuestion.question,
                                answers: nextQuestion.answers,
                                timeLimit: nextQuestion.timeLimit,
                                questionNumber: game.currentQuestionIndex + 1,
                                totalQuestions: game.questions.length,
                            };

                            io.to(roomCode).emit("next-question", {
                                question: questionData,
                            });

                            // Continue auto-advancing
                            autoAdvanceQuestion(
                                roomCode,
                                nextQuestion.timeLimit
                            );
                        },
                        timeLimit * 1000 + 3000
                    ); // Question time + 3 seconds showing answer
                }
            } catch (error) {
                socket.emit("error", { message: "Failed to start game" });
            }
        });

        // Submit answer
        socket.on(
            "submit-answer",
            async (data: {
                roomCode: string;
                playerId: string;
                answerIndex: number;
                timeElapsed: number;
            }) => {
                try {
                    const result = await gameManager.submitAnswer(
                        data.roomCode,
                        data.playerId,
                        data.answerIndex,
                        data.timeElapsed
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

                    // Update leaderboard for all players
                    const leaderboard = await gameManager.getLeaderboard(
                        data.roomCode
                    );
                    io.to(data.roomCode).emit("leaderboard-update", {
                        leaderboard,
                    });
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

        socket.on("disconnect", () => {
            console.log("Client disconnected:", socket.id);
        });
    });

    return io;
}
