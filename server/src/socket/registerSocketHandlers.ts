import type { Server, Socket } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "../types/socket";
import { RoomService } from "../game/roomService";
import { GameGateway } from "./gameGateway";

type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerSocketHandlers(io: Server<ClientToServerEvents, ServerToClientEvents>) {
  GameGateway.setIO(io);

  io.on("connection", (socket: IOSocket) => {
    socket.on("room:create", ({ name, playerId }) => {
      try {
        if (!name?.trim() || !playerId?.trim()) throw new Error("Invalid name/playerId");

        const { room, publicState } = RoomService.createRoom({
          name: name.trim(),
          playerId: playerId.trim(),
          socketId: socket.id,
        });

        socket.join(room.roomCode);
        socket.emit("room:created", { roomCode: room.roomCode, state: publicState });
        io.to(room.roomCode).emit("room:state", publicState);
      } catch (e: any) {
        socket.emit("room:error", e?.message || "Failed to create room");
      }
    });

    socket.on("room:join", ({ roomCode, name, playerId }) => {
      try {
        if (!roomCode?.trim() || !name?.trim() || !playerId?.trim()) throw new Error("Invalid join payload");

        const normalized = roomCode.trim().toUpperCase();
        const { room, publicState } = RoomService.joinRoom({
          roomCode: normalized,
          name: name.trim(),
          playerId: playerId.trim(),
          socketId: socket.id,
        });

        socket.join(room.roomCode);
        socket.emit("room:joined", { roomCode: room.roomCode, state: publicState });
        io.to(room.roomCode).emit("room:state", publicState);

        // auto sync for joiner (handles selecting_word/drawing/round_end/game_end)
        const sync = RoomService.getSyncState({ roomCode: room.roomCode, playerId: playerId.trim() });
        socket.emit("sync:state", sync);

        // if selecting_word and joiner is drawer -> also send options (sync already includes wordOptions)
        if (room.phase === "selecting_word" && room.round.drawerId === playerId.trim()) {
          socket.emit("round:wordOptions", {
            roomCode: room.roomCode,
            options: room.round.wordOptions,
            selectEndsAt: room.round.wordSelectEndsAt || Date.now(),
          });
        }
      } catch (e: any) {
        socket.emit("room:error", e?.message || "Failed to join room");
      }
    });

    socket.on("reconnect:hello", ({ roomCode, playerId }) => {
      try {
        const normalized = roomCode?.trim()?.toUpperCase();
        if (!normalized || !playerId?.trim()) throw new Error("Invalid payload");

        RoomService.reconnectHello({ roomCode: normalized, playerId: playerId.trim(), socketId: socket.id });
        socket.join(normalized);

        const sync = RoomService.getSyncState({ roomCode: normalized, playerId: playerId.trim() });
        socket.emit("sync:state", sync);
      } catch (e: any) {
        socket.emit("room:error", e?.message || "Reconnect failed");
      }
    });

    socket.on("room:leave", ({ roomCode, playerId }) => {
      try {
        const normalized = roomCode?.trim()?.toUpperCase();
        if (!normalized || !playerId?.trim()) return;

        socket.leave(normalized);
        const result = RoomService.leaveRoom({ roomCode: normalized, playerId: playerId.trim() });
        if (result) io.to(normalized).emit("room:state", result.publicState);
      } catch {}
    });

    socket.on("lobby:ready", ({ roomCode, playerId, isReady }) => {
      try {
        const normalized = roomCode?.trim()?.toUpperCase();
        if (!normalized || !playerId?.trim()) throw new Error("Invalid payload");

        const result = RoomService.setReady({ roomCode: normalized, playerId: playerId.trim(), isReady: !!isReady });
        io.to(normalized).emit("room:state", result.publicState);
      } catch (e: any) {
        socket.emit("room:error", e?.message || "Failed to set ready");
      }
    });

    socket.on("room:updateSettings", ({ roomCode, playerId, settings }) => {
      try {
        const normalized = roomCode?.trim()?.toUpperCase();
        if (!normalized || !playerId?.trim()) throw new Error("Invalid payload");

        const result = RoomService.updateSettings({ roomCode: normalized, playerId: playerId.trim(), settings: settings || {} });
        io.to(normalized).emit("room:state", result.publicState);
      } catch (e: any) {
        socket.emit("room:error", e?.message || "Failed to update settings");
      }
    });

    socket.on("game:start", ({ roomCode, playerId }) => {
      try {
        const normalized = roomCode?.trim()?.toUpperCase();
        if (!normalized || !playerId?.trim()) throw new Error("Invalid payload");

        const { publicState } = RoomService.startGame({ roomCode: normalized, playerId: playerId.trim() });
        io.to(normalized).emit("room:state", publicState);
        io.to(normalized).emit("game:started", { roomCode: normalized });
      } catch (e: any) {
        socket.emit("room:error", e?.message || "Failed to start game");
      }
    });

    socket.on("round:selectWord", ({ roomCode, playerId, word }) => {
      try {
        const normalized = roomCode?.trim()?.toUpperCase();
        if (!normalized || !playerId?.trim() || !word?.trim()) throw new Error("Invalid payload");

        RoomService.selectWord({
          roomCode: normalized,
          playerId: playerId.trim(),
          word: word.trim().toLowerCase(),
        });
      } catch (e: any) {
        socket.emit("room:error", e?.message || "Failed to select word");
      }
    });

    socket.on("draw:stroke", ({ roomCode, playerId, strokeId, color, width, points }) => {
      try {
        const normalized = roomCode?.trim()?.toUpperCase();
        if (!normalized || !playerId?.trim() || !strokeId?.trim()) throw new Error("Invalid payload");

        RoomService.addStroke({
          roomCode: normalized,
          playerId: playerId.trim(),
          strokeId: strokeId.trim(),
          color,
          width,
          points: points || [],
        });
      } catch (e: any) {
        socket.emit("room:error", e?.message || "Failed to draw");
      }
    });

    socket.on("draw:clear", ({ roomCode, playerId }) => {
      try {
        const normalized = roomCode?.trim()?.toUpperCase();
        if (!normalized || !playerId?.trim()) throw new Error("Invalid payload");
        RoomService.clearCanvas({ roomCode: normalized, playerId: playerId.trim() });
      } catch (e: any) {
        socket.emit("room:error", e?.message || "Failed to clear canvas");
      }
    });

    socket.on("sync:request", ({ roomCode, playerId }) => {
      try {
        const normalized = roomCode?.trim()?.toUpperCase();
        if (!normalized || !playerId?.trim()) throw new Error("Invalid payload");
        const sync = RoomService.getSyncState({ roomCode: normalized, playerId: playerId.trim() });
        socket.emit("sync:state", sync);
      } catch (e: any) {
        socket.emit("room:error", e?.message || "Failed to sync");
      }
    });

    socket.on("chat:send", ({ roomCode, playerId, text }) => {
      try {
        const normalized = roomCode?.trim()?.toUpperCase();
        if (!normalized || !playerId?.trim() || !text?.trim()) throw new Error("Invalid payload");

        RoomService.handleChatSend({ roomCode: normalized, playerId: playerId.trim(), text });
      } catch (e: any) {
        socket.emit("room:error", e?.message || "Failed to send chat");
      }
    });

    socket.on("disconnect", () => {
      RoomService.markDisconnectedBySocket(socket.id);
    });
  });
}
