import {describe, expect, test} from "vitest";
import {createDeck} from "../domain/cards.ts";
import {createGame} from "./reducer.ts";
import {shuffle} from "./shuffle.ts";
import {TEST_PLAYERS} from "../test-helpers.ts";

describe("shuffle and deal", () => {
    test("seed shuffle is reproducible", () => {
        const a = shuffle(createDeck(), "seed-1").map(card => card.id);
        const b = shuffle(createDeck(), "seed-1").map(card => card.id);
        const c = shuffle(createDeck(), "seed-2").map(card => card.id);
        expect(a).toEqual(b);
        expect(a).not.toEqual(c);
    });

    test("deal gives four unique 13-card hands covering the deck", () => {
        const game = createGame({players: TEST_PLAYERS, seed: "deal-1"});
        const all = game.hands.flat().map(card => card.id);
        expect(game.hands.every(hand => hand.length === 13 || game.dragonWin)).toBe(true);
        expect(new Set(all).size).toBe(52);
        expect(all).toHaveLength(52);
    });
});
