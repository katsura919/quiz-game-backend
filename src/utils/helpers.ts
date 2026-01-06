import { Game } from "../schema/game.schema";

export async function generateRoomCode(): Promise<string> {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code: string;
    let exists = true;

    while (exists) {
        code = "";
        for (let i = 0; i < 6; i++) {
            code += characters.charAt(
                Math.floor(Math.random() * characters.length)
            );
        }

        const existing = await Game.findOne({ roomCode: code });
        exists = !!existing;

        if (!exists) {
            return code;
        }
    }

    return "";
}

export function generatePlayerId(): string {
    return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
