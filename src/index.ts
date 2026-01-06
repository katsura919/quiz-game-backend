import fastify from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { setupSocketIO } from "./lib/socket.handlet";
import { triviaSetRoutes } from "./modules/triviaSet/triviaSet.routes";
import { gameRoutes } from "./modules/game/game.routes";

dotenv.config();

const app = fastify({
    logger: true,
});

// Register CORS
app.register(cors, {
    origin: process.env.FRONTEND_URL || "http://localhost:3001",
});

// MongoDB connection
const connectDB = async () => {
    try {
        await mongoose.connect(
            process.env.MONGODB_URI || "mongodb://localhost:27017/quiz-game"
        );
        console.log("MongoDB connected");
    } catch (error) {
        console.error("MongoDB connection error:", error);
        process.exit(1);
    }
};

// Health check route
app.get("/api/health", async (request, reply) => {
    return { status: "ok", timestamp: new Date().toISOString() };
});

// Register API routes
app.register(triviaSetRoutes);
app.register(gameRoutes);

const start = async () => {
    try {
        await connectDB();

        await app.listen({ port: 3000, host: "0.0.0.0" });

        // Setup Socket.IO after server starts
        setupSocketIO(app);

        console.log("Server running on http://localhost:3000");
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();
