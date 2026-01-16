import type { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "../types/socket";

let ioRef: Server<ClientToServerEvents, ServerToClientEvents> | null = null;

export const GameGateway = {
    setIO(io: Server<ClientToServerEvents, ServerToClientEvents>) {
        ioRef = io;
    },

    io() {
        if (!ioRef) throw new Error("GameGateway IO not set");
        return ioRef;
    },

    roomState(roomCode: string, state: any) {
        GameGateway.io().to(roomCode).emit("room:state", state);
    },

    roundMask(roomCode: string, mask: string) {
        GameGateway.io().to(roomCode).emit("round:mask", { roomCode, mask });
    },

    roundEnd(roomCode: string, word: string) {
        GameGateway.io().to(roomCode).emit("round:end", { roomCode, word });
    },

    drawStroke(roomCode: string, stroke: any) {
        GameGateway.io().to(roomCode).emit("draw:stroke", stroke);
    },

    drawClear(roomCode: string) {
        GameGateway.io().to(roomCode).emit("draw:clear", { roomCode });
    },

    syncStateToSocket(socketId: string, data: any) {
        GameGateway.io().to(socketId).emit("sync:state", data);
    },
};
