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

app.get("/", (_: any, res: any) => res.json({ ok: true }));
app.get("/health", (_: any, res: any) => res.json({ status: "healthy", success: true, }));

const server = http.createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
    cors: {
        origin: "*",
        credentials: true,
    },
    transports: ["websocket", "polling"],
});

registerSocketHandlers(io);

server.listen(ENV.PORT, () => {
    console.log(`Server running on port ${ENV.PORT}`);
});
