import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { ENV } from "./config/env";
import { registerSocketHandlers } from "./socket/registerSocketHandlers";
import type { ClientToServerEvents, ServerToClientEvents } from "./types/socket";

const app = express();
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());

app.get("/health", (_: any, res: any) => res.json({ status: "healthy", ok: true, env: ENV.NODE_ENV }));

const server = http.createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
    cors: {
        origin: ENV.CORS_ORIGIN === "*" ? true : ENV.CORS_ORIGIN,
        credentials: true,
    },
    transports: ["websocket", "polling"],
});

registerSocketHandlers(io);

server.listen(ENV.PORT, () => {
    console.log(`Server running on port ${ENV.PORT}`);
});
