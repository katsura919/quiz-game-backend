import { FastifyRequest, FastifyReply } from "fastify";
import { TriviaSet } from "../../schema/triviaSet.schema";

export class TriviaSetController {
    // Get all trivia sets
    async getAllTriviaSets(request: FastifyRequest, reply: FastifyReply) {
        try {
            const sets = await TriviaSet.find({ isPublic: true });
            return { success: true, data: sets };
        } catch (error) {
            return reply
                .status(500)
                .send({ success: false, error: "Failed to fetch trivia sets" });
        }
    }

    // Get trivia set by ID
    async getTriviaSetById(
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
    ) {
        try {
            const set = await TriviaSet.findById(request.params.id);

            if (!set) {
                return reply
                    .status(404)
                    .send({ success: false, error: "Trivia set not found" });
            }

            return { success: true, data: set };
        } catch (error) {
            return reply
                .status(500)
                .send({ success: false, error: "Failed to fetch trivia set" });
        }
    }

    // Create trivia set
    async createTriviaSet(request: FastifyRequest, reply: FastifyReply) {
        try {
            const triviaSet = new TriviaSet(request.body);
            await triviaSet.save();
            return { success: true, data: triviaSet };
        } catch (error) {
            return reply
                .status(500)
                .send({ success: false, error: "Failed to create trivia set" });
        }
    }
}

export const triviaSetController = new TriviaSetController();
