import { io, Socket } from "socket.io-client";
import type {ClientToServerEvents, ServerToClientEvents} from "../types/socket.ts";

export type IOSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export const socket: IOSocket = io(import.meta.env.VITE_WS_URL, {
    transports: ["websocket", "polling"],
    autoConnect: false,
});
