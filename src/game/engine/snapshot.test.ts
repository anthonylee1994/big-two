import {describe, expect, test} from "vitest";
import {createGame} from "./reducer.ts";
import {toPublicSnapshot} from "./snapshot.ts";
import {TEST_PLAYERS} from "../test-helpers.ts";

describe("public snapshot", () => {
    test("does not leak other players' remaining cards", () => {
        const state = createGame({players: TEST_PLAYERS, seed: "snap-1"});
        for (const player of state.players) {
            const snapshot = toPublicSnapshot(state, player.id);
            const json = JSON.stringify(snapshot);
            expect(snapshot.remainingHands).toBeNull();
            expect(snapshot.ownHand.map(card => card.id).sort()).toEqual(state.hands[player.seat].map(card => card.id).sort());
            for (const other of state.players) {
                if (other.seat === player.seat) {
                    continue;
                }
                for (const card of state.hands[other.seat]) {
                    expect(json).not.toContain(`"${card.id}"`);
                }
            }
        }
    });
});
