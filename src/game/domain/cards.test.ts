import {describe, expect, test} from "vitest";
import {compareCard, createDeck, DIAMOND_3_ID, parseCardId, SPADE_2_ID} from "./cards.ts";

describe("cards", () => {
    test("deck has 52 unique cards", () => {
        const deck = createDeck();
        expect(deck).toHaveLength(52);
        expect(new Set(deck.map(card => card.id)).size).toBe(52);
    });

    test("smallest card is diamond 3 and largest is spade 2", () => {
        const deck = [...createDeck()].sort(compareCard);
        expect(deck[0].id).toBe(DIAMOND_3_ID);
        expect(deck[51].id).toBe(SPADE_2_ID);
    });

    test("rank beats suit: diamond 8 > spade 7", () => {
        expect(compareCard(parseCardId("D8"), parseCardId("S7"))).toBeGreaterThan(0);
    });

    test("same rank compares by suit: spade 7 > heart 7", () => {
        expect(compareCard(parseCardId("S7"), parseCardId("H7"))).toBeGreaterThan(0);
        expect(compareCard(parseCardId("H7"), parseCardId("C7"))).toBeGreaterThan(0);
        expect(compareCard(parseCardId("C7"), parseCardId("D7"))).toBeGreaterThan(0);
    });
});
