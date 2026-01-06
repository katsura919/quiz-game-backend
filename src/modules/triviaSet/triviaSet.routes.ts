import { FastifyInstance } from "fastify";
import { triviaSetController } from "./triviaSet.controller";

export async function triviaSetRoutes(app: FastifyInstance) {
    // Get all trivia sets
    app.get("/api/trivia-sets", (request, reply) =>
        triviaSetController.getAllTriviaSets(request, reply)
    );

    // Get trivia set by ID
    app.get<{ Params: { id: string } }>(
        "/api/trivia-sets/:id",
        (request, reply) => triviaSetController.getTriviaSetById(request, reply)
    );

    // Create trivia set
    app.post("/api/trivia-sets", (request, reply) =>
        triviaSetController.createTriviaSet(request, reply)
    );
}
