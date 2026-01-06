import { Game } from "../schema/game.schema";
import { IGame } from "../types/game.types";
import { IPlayer } from "../types/player.types";
import { IQuestion } from "../types/question.types";
import { generateRoomCode } from "../utils/helpers";

export class GameManager {
    // Create a new game room
    async createGame(hostId: string, questions: IQuestion[]): Promise<IGame> {
        const roomCode = await generateRoomCode();

        const game = new Game({
            roomCode,
            hostId,
            status: "waiting",
            players: [],
            questions,
            currentQuestionIndex: -1,
        });

        await game.save();
        return game;
    }

    // Get game by room code
    async getGame(roomCode: string): Promise<IGame | null> {
        return await Game.findOne({ roomCode });
    }

    // Add player to game
    async addPlayer(roomCode: string, player: IPlayer): Promise<IGame | null> {
        const game = await Game.findOne({ roomCode });

        if (!game || game.status !== "waiting") {
            return null;
        }

        // Check if player already exists
        const existingPlayer = game.players.find(
            (p: any) => p.id === player.id
        );
        if (existingPlayer) {
            return game;
        }

        game.players.push(player);
        await game.save();
        return game;
    }

    // Remove player from game
    async removePlayer(
        roomCode: string,
        playerId: string
    ): Promise<IGame | null> {
        const game = await Game.findOne({ roomCode });

        if (!game) {
            return null;
        }

        game.players = game.players.filter((p: any) => p.id !== playerId);
        await game.save();
        return game;
    }

    // Start game
    async startGame(roomCode: string): Promise<IGame | null> {
        const game = await Game.findOne({ roomCode });

        if (!game || game.status !== "waiting" || game.players.length === 0) {
            return null;
        }

        game.status = "playing";
        game.startedAt = new Date();
        game.currentQuestionIndex = 0;
        await game.save();
        return game;
    }

    // Submit answer
    async submitAnswer(
        roomCode: string,
        playerId: string,
        answerIndex: number,
        timeElapsed: number
    ): Promise<{ correct: boolean; points: number; game: IGame } | null> {
        const game = await Game.findOne({ roomCode });

        if (!game || game.status !== "playing") {
            return null;
        }

        const currentQuestion = game.questions[game.currentQuestionIndex];
        const player = game.players.find((p) => p.id === playerId);

        if (!player || !currentQuestion) {
            return null;
        }

        // Check if already answered
        if (player.answeredQuestions.includes(currentQuestion.id)) {
            return null;
        }

        const correct = answerIndex === currentQuestion.correctAnswer;
        let points = 0;

        if (correct) {
            // Calculate points based on time (faster = more points)
            const timeBonus = Math.max(
                0,
                1 - timeElapsed / currentQuestion.timeLimit
            );
            points = Math.round(
                currentQuestion.points * (0.5 + timeBonus * 0.5)
            );
            player.score += points;
        }

        player.answeredQuestions.push(currentQuestion.id);
        await game.save();

        return { correct, points, game };
    }

    // Move to next question
    async nextQuestion(roomCode: string): Promise<IGame | null> {
        const game = await Game.findOne({ roomCode });

        if (!game || game.status !== "playing") {
            return null;
        }

        game.currentQuestionIndex++;

        // Check if game is finished
        if (game.currentQuestionIndex >= game.questions.length) {
            game.status = "finished";
            game.finishedAt = new Date();
            game.currentQuestionIndex = game.questions.length - 1;
        }

        await game.save();
        return game;
    }

    // Get leaderboard
    async getLeaderboard(roomCode: string): Promise<IPlayer[]> {
        const game = await Game.findOne({ roomCode });

        if (!game) {
            return [];
        }

        return game.players
            .sort((a, b) => b.score - a.score)
            .map((p) => ({
                id: p.id,
                name: p.name,
                score: p.score,
                avatar: p.avatar,
                answeredQuestions: p.answeredQuestions,
            }));
    }
}

export const gameManager = new GameManager();
