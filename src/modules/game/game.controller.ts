import { FastifyRequest, FastifyReply } from "fastify";
import { gameManager } from "../../lib/gameManager";

export class GameController {
    // Get game by room code
    async getGameByRoomCode(
        request: FastifyRequest<{ Params: { roomCode: string } }>,
        reply: FastifyReply
    ) {
        try {
            const game = await gameManager.getGame(request.params.roomCode);

            if (!game) {
                return reply
                    .status(404)
                    .send({ success: false, error: "Game not found" });
            }

            return { success: true, data: game };
        } catch (error) {
            return reply
                .status(500)
                .send({ success: false, error: "Failed to fetch game" });
        }
    }

    // Get leaderboard by room code
    async getLeaderboard(
        request: FastifyRequest<{ Params: { roomCode: string } }>,
        reply: FastifyReply
    ) {
        try {
            const leaderboard = await gameManager.getLeaderboard(
                request.params.roomCode
            );

            if (!leaderboard) {
                return reply
                    .status(404)
                    .send({ success: false, error: "Game not found" });
            }

            return { success: true, data: leaderboard };
        } catch (error) {
            return reply
                .status(500)
                .send({ success: false, error: "Failed to fetch leaderboard" });
        }
    }
}

export const gameController = new GameController();
