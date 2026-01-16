export const WORD_BANK: string[] = [
    "elephant",
    "guitar",
    "mountain",
    "camera",
    "pizza",
    "rainbow",
    "bicycle",
    "doctor",
    "airport",
    "library",
    "football",
    "umbrella",
    "computer",
    "diamond",
    "whisper",
    "volcano",
    "painting",
    "sandwich",
    "rocket",
    "butterfly",
];

export function pickRandomWords(count = 3): string[] {
    const pool = [...WORD_BANK];
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, Math.min(count, pool.length));
}
