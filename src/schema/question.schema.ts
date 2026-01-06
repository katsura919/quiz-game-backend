import { Schema } from "mongoose";

export const QuestionSchema = new Schema(
    {
        id: { type: String, required: true },
        question: { type: String, required: true },
        answers: [{ type: String, required: true }],
        correctAnswer: { type: Number, required: true },
        timeLimit: { type: Number, default: 30 },
        points: { type: Number, default: 100 },
    },
    { _id: false }
);
