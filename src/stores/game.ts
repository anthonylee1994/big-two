import {create} from "zustand";
import type {PublicGameState} from "../game/domain/types.ts";

export interface GameStoreState {
    snapshot: PublicGameState | null;
    selectedIds: string[];
    pendingCommandId: string | null;
    lastError: string | null;
    setSnapshot: (snapshot: PublicGameState | null) => void;
    toggleCard: (cardId: string) => void;
    clearSelection: () => void;
    setPending: (commandId: string | null) => void;
    setError: (error: string | null) => void;
}

const gameStore = create<GameStoreState>(set => ({
    snapshot: null,
    selectedIds: [],
    pendingCommandId: null,
    lastError: null,
    setSnapshot: snapshot =>
        set(state => ({
            snapshot,
            selectedIds: snapshot ? state.selectedIds.filter(id => snapshot.ownHand.some(card => card.id === id)) : [],
        })),
    toggleCard: cardId =>
        set(state => {
            if (state.selectedIds.includes(cardId)) {
                return {selectedIds: state.selectedIds.filter(id => id !== cardId)};
            }
            if (state.selectedIds.length >= 5) {
                return state;
            }
            return {selectedIds: [...state.selectedIds, cardId]};
        }),
    clearSelection: () => set({selectedIds: []}),
    setPending: pendingCommandId => set({pendingCommandId}),
    setError: lastError => set({lastError}),
}));

export function useGameStore<T>(selector: (state: GameStoreState) => T): T {
    return gameStore(selector);
}

export function getGameState(): GameStoreState {
    return gameStore.getState();
}
