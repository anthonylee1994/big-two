import {create} from "zustand";
import type {RoomSnapshot} from "../protocol/messages.ts";

export interface LobbyState {
    room: RoomSnapshot | null;
    setRoom: (room: RoomSnapshot | null) => void;
}

const lobbyStore = create<LobbyState>(set => ({
    room: null,
    setRoom: room => set({room}),
}));

export function useLobbyStore<T>(selector: (state: LobbyState) => T): T {
    return lobbyStore(selector);
}

export function getLobbyState(): LobbyState {
    return lobbyStore.getState();
}
