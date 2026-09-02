import {create} from "zustand";
import {persist} from "zustand/middleware";
import {createId} from "../lib/id.ts";

export interface SessionState {
    playerId: string;
    displayName: string;
    reconnectToken: string;
    setName: (name: string) => void;
}

const sessionStore = create<SessionState>()(
    persist(
        set => ({
            playerId: createId(),
            displayName: "訪客",
            reconnectToken: createId(),
            setName: name => set({displayName: name.trim() || "訪客"}),
        }),
        {name: "big-two-session"}
    )
);

export function useSessionStore<T>(selector: (state: SessionState) => T): T {
    return sessionStore(selector);
}

export function getSessionState(): SessionState {
    return sessionStore.getState();
}
