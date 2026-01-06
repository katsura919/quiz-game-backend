import { Document } from "mongoose";
import { IPlayer } from "./player.types";
import { IQuestion } from "./question.types";

export interface IGame extends Document {
    roomCode: string;
    hostId: string;
    status: "waiting" | "playing" | "finished";
    players: IPlayer[];
    currentQuestionIndex: number;
    questions: IQuestion[];
    startedAt?: Date;
    finishedAt?: Date;
    createdAt: Date;
}

export type GameStatus = "waiting" | "playing" | "finished";
