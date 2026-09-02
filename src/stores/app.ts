import {create} from "zustand";

export type AppScreen = "home" | "lobby" | "game" | "results" | "rules" | "settings";

export interface AppState {
    screen: AppScreen;
    joinCode: string;
    updateReady: boolean;
    setScreen: (screen: AppScreen) => void;
    setJoinCode: (joinCode: string) => void;
    setUpdateReady: (updateReady: boolean) => void;
}

const appStore = create<AppState>(set => ({
    screen: "home",
    joinCode: "",
    updateReady: false,
    setScreen: screen => set({screen}),
    setJoinCode: joinCode => set({joinCode}),
    setUpdateReady: updateReady => set({updateReady}),
}));

export function useAppStore<T>(selector: (state: AppState) => T): T {
    return appStore(selector);
}

export function getAppState(): AppState {
    return appStore.getState();
}
