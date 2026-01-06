import { Document } from "mongoose";

export interface ITriviaSet extends Document {
    name: string;
    description: string;
    category: string;
    difficulty: "easy" | "medium" | "hard";
    questions: {
        question: string;
        answers: string[];
        correctAnswer: number;
        timeLimit: number;
        points: number;
    }[];
    createdBy?: string;
    isPublic: boolean;
    createdAt: Date;
}

export type DifficultyLevel = "easy" | "medium" | "hard";
