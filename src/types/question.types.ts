export interface IQuestion {
    id: string;
    question: string;
    answers: string[];
    correctAnswer: number;
    timeLimit: number;
    points: number;
}
