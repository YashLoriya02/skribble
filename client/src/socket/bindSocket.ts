import {socket} from "./socket";
import {useGameStore} from "../store/useGameStore.ts";
import {SFX} from "../audio/sound.ts";

let bound = false;
let prevPlayerIds = new Set<string>();
let suppressRoundEndUntil = 0;

const suppress = (ms: number) => {
    const until = Date.now() + ms;
    suppressRoundEndUntil = Math.max(suppressRoundEndUntil, until);
};

const canPlayRoundEnd = () => Date.now() > suppressRoundEndUntil;

export function bindSocketOnce() {
    if (bound) return;
    bound = true;

    const store = useGameStore;

    socket.on("connect", () => store.getState().setConnected(true));
    socket.on("disconnect", () => store.getState().setConnected(false));

    socket.on("room:error", (msg) => store.getState().setError(msg || "Something went wrong"));

    socket.on("room:created", ({roomCode, state}) => {
        store.getState().setRoomCode(roomCode);
        store.getState().setPublicState(state);
        store.getState().setError(null);
    });

    socket.on("room:joined", ({roomCode, state}) => {
        store.getState().setRoomCode(roomCode);
        store.getState().setPublicState(state);
        store.getState().setError(null);
    });

    socket.on("room:state", (state) => {
        const ids = new Set(state.players.map((p: any) => p.playerId));
        if (prevPlayerIds.size > 0) {
            let added = 0;
            ids.forEach((id) => {
                if (!prevPlayerIds.has(id)) added++;
            });
            if (added > 0) SFX.play("join");
        }

        prevPlayerIds = ids;

        store.getState().setPublicState(state);

        const st = useGameStore.getState();

        if (state.phase === "selecting_word") {
            st.setDrawerWord(null);
            st.setLastRoundWord(null);
        }

        if (state.phase === "drawing") {
            st.setLastRoundWord(null);
        }
    });

    socket.on("sync:state", (sync) => {
        store.getState().hydrateFromSync(sync);
    });

    socket.on("round:wordOptions", ({options, selectEndsAt}) => {
        store.getState().setWordOptions({options, selectEndsAt});
    });

    socket.on("round:start", () => {
        store.getState().clearStrokes();
        SFX.play("start");
    });

    socket.on("round:mask", ({mask}) => {
        const cur = store.getState().syncState;
        if (cur) store.getState().setSyncState({...cur, mask});
    });

    socket.on("round:end", ({word}) => {
        store.setState({lastRoundEnd: {word, ts: Date.now()}} as any);
        if (canPlayRoundEnd()) SFX.play("roundEnd");
    });

    socket.on("draw:stroke", (stroke) => {
        store.getState().addStroke(stroke);
    });

    socket.on("draw:clear", () => {
        store.getState().clearStrokes();
    });

    socket.on("chat:message", (msg) => {
        store.getState().addChat(msg);

        SFX.play("chat");
    });

    socket.on("guess:correct", ({ name, playerId: who }) => {
        const store = useGameStore.getState();

        store.addChat({
            roomCode: store.roomCode,
            playerId: "__system__",
            name: "",
            text: `${name} guessed the word!`,
            ts: Date.now(),
            type: "correct",
        } as any);

        suppress(1500);
        if (who === store.playerId) SFX.play("correct");
    });


    socket.on("round:word", ({word}) => {
        useGameStore.getState().setDrawerWord(word);
    });

    socket.on("round:end", ({word}) => {
        const store = useGameStore.getState();

        if (!word) return;

        if (canPlayRoundEnd()) SFX.play("roundEnd");
        store.addChat({
            roomCode: store.roomCode,
            playerId: "__system__",
            name: "",
            text: `The word was "${word}"`,
            ts: Date.now(),
            type: "reveal",
        } as any);

        store.setLastRoundWord(word);
    });

    socket.on("game:ended", ({leaderboard}) => {
        store.getState().setLeaderboard(leaderboard);
        SFX.play("gameEnd");
    });
}
