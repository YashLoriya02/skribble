import dataset from "../data/dataset_2.json";
import { RoomState } from "../types/game";

const pickRandom = (arr: string[], count: number): string[] => {
    const pool = [...arr];
    const out: string[] = [];

    while (out.length < count && pool.length > 0) {
        const idx = Math.floor(Math.random() * pool.length);
        out.push(pool.splice(idx, 1)[0]);
    }

    return out;
}

export function pickFromDataset(): string[] {
    const easy: string[] = dataset.easy;
    const medium: string[] = dataset.medium;
    const hard: string[] = dataset.hard;

    return [
        ...pickRandom(easy, 2),
        ...pickRandom(medium, 1),
        ...pickRandom(hard, 2),
    ];
}

const getWordPool = (room: RoomState) => {
    const custom = room.settings.customWords || [];
    if (custom.length >= 3) return custom;
    return null;
}

export function pickRandomWords(room: RoomState) {
    const customPool: string[] | null = getWordPool(room);

    if (customPool) {
        const pool = [...customPool];
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }

        return pool.slice(0, Math.min(5, pool.length));
    }

    return pickFromDataset();
}

