import mongoose, { Schema } from "mongoose";
import { IGame } from "../types/game.types";
import { PlayerSchema } from "./player.schema";
import { QuestionSchema } from "./question.schema";

const GameSchema = new Schema({
    roomCode: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    hostId: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ["waiting", "playing", "finished"],
        default: "waiting",
    },
    players: [PlayerSchema],
    currentQuestionIndex: {
        type: Number,
        default: -1,
    },
    questions: [QuestionSchema],
    startedAt: { type: Date },
    finishedAt: { type: Date },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export const Game = mongoose.model<IGame>("Game", GameSchema);
