import {create} from "zustand";
import {persist} from "zustand/middleware";

export type HandSort = "rank" | "suit";

export interface PreferencesState {
    sound: boolean;
    animation: boolean;
    haptics: boolean;
    handSort: HandSort;
    setSound: (value: boolean) => void;
    setAnimation: (value: boolean) => void;
    setHaptics: (value: boolean) => void;
    setHandSort: (value: HandSort) => void;
}

const preferencesStore = create<PreferencesState>()(
    persist(
        set => ({
            sound: false,
            animation: true,
            haptics: true,
            handSort: "rank",
            setSound: sound => set({sound}),
            setAnimation: animation => set({animation}),
            setHaptics: haptics => set({haptics}),
            setHandSort: handSort => set({handSort}),
        }),
        {name: "big-two-preferences"}
    )
);

export function usePreferencesStore<T>(selector: (state: PreferencesState) => T): T {
    return preferencesStore(selector);
}

export function getPreferencesState(): PreferencesState {
    return preferencesStore.getState();
}
