import { FastifyInstance } from "fastify";
import { gameController } from "./game.controller";

export async function gameRoutes(app: FastifyInstance) {
    // Get game by room code
    app.get<{ Params: { roomCode: string } }>(
        "/api/games/:roomCode",
        (request, reply) => gameController.getGameByRoomCode(request, reply)
    );

    // Get leaderboard by room code
    app.get<{ Params: { roomCode: string } }>(
        "/api/games/:roomCode/leaderboard",
        (request, reply) => gameController.getLeaderboard(request, reply)
    );
}
