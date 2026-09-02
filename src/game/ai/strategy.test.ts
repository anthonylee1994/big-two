import {describe, expect, test} from "vitest";
import {toPublicSnapshot} from "../engine/snapshot.ts";
import {c, gameWithHands} from "../test-helpers.ts";
import {createDeck, sortCards} from "../domain/cards.ts";
import {chooseAction} from "./strategy.ts";
import {listLegalPlays, playContextFor} from "../engine/legal.ts";

function controlledGame(seat0: string[]) {
    const deck = createDeck();
    const used = new Set(seat0);
    const hands = [c(...seat0), [] as ReturnType<typeof c>, [] as ReturnType<typeof c>, [] as ReturnType<typeof c>];
    const remaining = deck.filter(card => !used.has(card.id));
    for (let seat = 0; seat < 4; seat += 1) {
        while (hands[seat].length < 13) {
            hands[seat].push(remaining.shift()!);
        }
        hands[seat] = sortCards(hands[seat]);
    }
    return gameWithHands(hands);
}

describe("AI", () => {
    test("only returns a legal play or pass", () => {
        const state = controlledGame(["D3", "S4", "D5", "D6", "D7", "D8", "D9", "D10", "DJ", "DQ", "DK", "DA", "H4"]);
        const snapshot = toPublicSnapshot(state, state.players[0].id);
        const decision = chooseAction({hand: state.hands[0], snapshot});
        expect(decision.type).toBe("play");
        if (decision.type === "play") {
            const legal = listLegalPlays(state.hands[0], playContextFor(state, 0));
            expect(legal.some(play => play.cards.length === decision.cardIds.length && play.cards.every(card => decision.cardIds.includes(card.id)))).toBe(true);
        }
    });

    test("without the lead prefers the smallest beating combination", () => {
        const state = controlledGame(["D3", "S4", "H4", "D8", "S8", "D9", "D10", "DJ", "DQ", "DK", "DA", "H5", "C5"]);
        const afterOpen = {
            ...state,
            mustIncludeDiamond3: false,
            lastPlay: {kind: "single" as const, cards: c("H7")},
            currentPlayerSeat: 0 as const,
            leadSeat: 1 as const,
        };
        const snapshot = toPublicSnapshot(afterOpen, afterOpen.players[0].id);
        const decision = chooseAction({hand: afterOpen.hands[0], snapshot});
        expect(decision.type).toBe("play");
        if (decision.type === "play") {
            expect(decision.cardIds).toEqual(["D8"]);
        }
    });
});
