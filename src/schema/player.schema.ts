import { Schema } from "mongoose";

export const PlayerSchema = new Schema(
    {
        id: { type: String, required: true },
        name: { type: String, required: true },
        score: { type: Number, default: 0 },
        avatar: { type: String },
        answeredQuestions: [{ type: String }],
    },
    { _id: false }
);
