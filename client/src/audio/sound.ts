type SfxKey =
    | "join"
    | "tick"
    | "roundEnd"
    | "gameEnd"
    | "correct"
    | "start"
    | "chat";

const SOURCES: Record<SfxKey, string> = {
    join: "./sfx/join.mp3",
    tick: "./sfx/tick.mp3",
    roundEnd: "./sfx/round-end.mp3",
    gameEnd: "./sfx/game-end.mp3",
    correct: "./sfx/correct.mp3",
    start: "./sfx/start.mp3",
    chat: "./sfx/chat.mp3",
};

class SoundManager {
    private audios = new Map<SfxKey, HTMLAudioElement>();
    private unlocked = false;
    private muted = false;
    private volume = 0.5;

    init() {
        (Object.keys(SOURCES) as SfxKey[]).forEach((k) => {
            const a = new Audio(SOURCES[k]);
            a.preload = "auto";
            a.volume = this.volume;
            this.audios.set(k, a);
        });
    }

    setMuted(m: boolean) {
        this.muted = m;
    }

    setVolume(v: number) {
        this.volume = Math.max(0, Math.min(1, v));
        this.audios.forEach((a) => (a.volume = this.volume));
    }

    async unlock() {
        if (this.unlocked) return;
        this.unlocked = true;

        // "Prime" audio with a silent play attempt (browser-friendly)
        const a = this.audios.get("tick");
        if (!a) return;
        try {
            a.volume = 0; // silent
            await a.play();
            a.pause();
            a.currentTime = 0;
            a.volume = this.volume;
        } catch {}
    }

    play(key: SfxKey) {
        if (this.muted) return;
        const a = this.audios.get(key);

        if (!a) return;

        if (key === "tick") {
            const c = a.cloneNode(true) as HTMLAudioElement;
            c.volume = this.volume;
            c.play().catch(() => {});
            return;
        }

        try {
            a.currentTime = 0;
            a.play().catch(() => {});
        } catch {}
    }
}

export const SFX = new SoundManager();
