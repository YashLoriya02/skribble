import {socket} from "./socket";
import {useGameStore} from "../store/useGameStore.ts";

let bound = false;

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
    });

    socket.on("round:mask", ({mask}) => {
        const cur = store.getState().syncState;
        if (cur) store.getState().setSyncState({...cur, mask});
    });

    socket.on("round:end", ({word}) => {
        store.setState({lastRoundEnd: {word, ts: Date.now()}} as any);
    });

    socket.on("draw:stroke", (stroke) => {
        store.getState().addStroke(stroke);
    });

    socket.on("draw:clear", () => {
        store.getState().clearStrokes();
    });

    socket.on("chat:message", (msg) => {
        store.getState().addChat(msg);
    });

    socket.on("guess:correct", ({name}) => {
        const store = useGameStore.getState();

        store.addChat({
            roomCode: store.roomCode,
            playerId: "__system__",
            name: "",
            text: `${name} guessed the word!`,
            ts: Date.now(),
            type: "correct",
        } as any);
    });

    socket.on("round:word", ({word}) => {
        useGameStore.getState().setDrawerWord(word);
    });

    socket.on("round:end", ({word}) => {
        const store = useGameStore.getState();

        if (!word) return;

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
    });
}
