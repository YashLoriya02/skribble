import type { RoomState } from "../types/game";

export const roomStore = new Map<string, RoomState>();

export function getRoom(roomCode: string): RoomState | undefined {
  return roomStore.get(roomCode);
}

export function setRoom(roomCode: string, state: RoomState): void {
  roomStore.set(roomCode, state);
}

export function deleteRoom(roomCode: string): void {
  roomStore.delete(roomCode);
}
