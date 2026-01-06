import mongoose, { Schema } from "mongoose";
import { ITriviaSet } from "../types/triviaSet.types";

const TriviaSetSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
    },
    category: {
        type: String,
        required: true,
    },
    difficulty: {
        type: String,
        enum: ["easy", "medium", "hard"],
        default: "medium",
    },
    questions: [
        {
            question: { type: String, required: true },
            answers: [{ type: String, required: true }],
            correctAnswer: { type: Number, required: true },
            timeLimit: { type: Number, default: 30 },
            points: { type: Number, default: 100 },
        },
    ],
    createdBy: { type: String },
    isPublic: {
        type: Boolean,
        default: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export const TriviaSet = mongoose.model<ITriviaSet>(
    "TriviaSet",
    TriviaSetSchema
);
