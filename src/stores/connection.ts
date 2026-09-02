import {create} from "zustand";

export type ConnectionStatus = "idle" | "connecting" | "connected" | "reconnecting" | "offline";

export interface ConnectionState {
    status: ConnectionStatus;
    lastError: string | null;
    latency: number | null;
    setStatus: (status: ConnectionStatus) => void;
    setError: (error: string | null) => void;
    setLatency: (latency: number | null) => void;
}

const connectionStore = create<ConnectionState>(set => ({
    status: "idle",
    lastError: null,
    latency: null,
    setStatus: status => set({status}),
    setError: lastError => set({lastError}),
    setLatency: latency => set({latency}),
}));

export function useConnectionStore<T>(selector: (state: ConnectionState) => T): T {
    return connectionStore(selector);
}

export function getConnectionState(): ConnectionState {
    return connectionStore.getState();
}
