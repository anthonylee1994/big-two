import {describe, expect, test} from "vitest";
import {createDeck, parseCardId, sortCards} from "../domain/cards.ts";
import type {Card} from "../domain/types.ts";
import {c, gameWithHands, pass, play, TEST_PLAYERS, tryPass, tryPlay} from "../test-helpers.ts";
import {hasDragon} from "./legal.ts";
import {applyAction, createGame, createGameFromHands} from "./reducer.ts";

function takeFillCard(hand: Card[], remaining: Card[]): Card {
    const ranks = new Set(hand.map(card => card.rank));
    const duplicateIndex = remaining.findIndex(card => ranks.has(card.rank));
    const index = duplicateIndex >= 0 ? duplicateIndex : 0;
    const [card] = remaining.splice(index, 1);
    return card;
}

function handsWithControl(overrides: Partial<Record<number, string[]>>): ReturnType<typeof gameWithHands> {
    const deck = createDeck();
    const used = new Set<string>();
    const hands: Card[][] = [[], [], [], []];
    for (const [seat, ids] of Object.entries(overrides)) {
        const unique = new Set(ids);
        if (unique.size !== ids.length) {
            throw new Error(`Duplicate cards in seat ${seat}`);
        }
        for (const id of ids) {
            if (used.has(id)) {
                throw new Error(`Card ${id} assigned twice`);
            }
            used.add(id);
        }
        hands[Number(seat)] = c(...ids);
    }
    const remaining = deck.filter(card => !used.has(card.id));
    for (let seat = 0; seat < 4; seat += 1) {
        while (hands[seat].length < 13) {
            hands[seat].push(takeFillCard(hands[seat], remaining));
        }
        hands[seat] = sortCards(hands[seat]);
    }
    if (hands.some(hand => hasDragon(hand))) {
        throw new Error("Could not break accidental dragon");
    }
    return gameWithHands(hands);
}

describe("opening and turns", () => {
    test("player with diamond 3 starts and must include it", () => {
        const state = handsWithControl({
            0: ["D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10", "DJ", "DQ", "DK", "DA", "C3"],
        });
        expect(state.currentPlayerSeat).toBe(0);
        expect(tryPlay(state, 0, ["D4"]).ok).toBe(false);
        if (!tryPlay(state, 0, ["D4"]).ok) {
            expect(tryPlay(state, 0, ["D4"]).error.code).toBe("mustIncludeDiamond3");
        }
        const opened = play(state, 0, ["D3"]);
        expect(opened.mustIncludeDiamond3).toBe(false);
        expect(opened.lastPlay?.cards[0].id).toBe("D3");
    });

    test("opening can be a pair that includes diamond 3", () => {
        const state = handsWithControl({
            0: ["D3", "C3", "D5", "D6", "D7", "D8", "D9", "D10", "DJ", "DQ", "DK", "DA", "H4"],
        });
        const opened = play(state, 0, ["D3", "C3"]);
        expect(opened.lastPlay?.kind).toBe("pair");
    });

    test("pass after playing can re-enter later in the same trick", () => {
        const state = handsWithControl({
            0: ["D3", "S4", "D5", "D6", "D7", "D8", "D9", "D10", "DJ", "DQ", "DK", "DA", "H4"],
            1: ["C4", "H6", "C6", "C7", "C8", "C9", "C10", "CJ", "CQ", "CK", "CA", "C2", "H3"],
            2: ["H5", "S6", "H7", "H8", "H9", "H10", "HJ", "HQ", "HK", "HA", "H2", "S3", "S7"],
            3: ["S5", "S8", "S9", "S10", "SJ", "SQ", "SK", "SA", "S2", "D2", "D4", "C5", "C3"],
        });
        let next = play(state, 0, ["D3"]);
        next = pass(next, 3);
        next = pass(next, 2);
        next = play(next, 1, ["C4"]);
        next = pass(next, 0);
        next = play(next, 3, ["S5"]);
        expect(next.lastPlay?.cards[0].id).toBe("S5");
        expect(next.leadSeat).toBe(3);
        expect(next.playLog.filter(entry => entry.seat === 3).map(entry => (entry.play === "pass" ? "pass" : entry.play.cards[0].id))).toEqual(["pass", "S5"]);
    });

    test("three consecutive passes return lead to last player", () => {
        const state = handsWithControl({
            0: ["D3", "S4", "D5", "D6", "D7", "D8", "D9", "D10", "DJ", "DQ", "DK", "DA", "H4"],
            1: ["C4", "S5", "C6", "C7", "C8", "C9", "C10", "CJ", "CQ", "CK", "CA", "C2", "H5"],
            2: ["H3", "S6", "H7", "H8", "H9", "H10", "HJ", "HQ", "HK", "HA", "H2", "S3", "S7"],
            3: ["S8", "S9", "S10", "SJ", "SQ", "SK", "SA", "S2", "D2", "H6", "D4", "C5", "C3"],
        });
        let next = play(state, 0, ["D3"]);
        next = pass(next, 3);
        next = pass(next, 2);
        next = pass(next, 1);
        expect(next.lastPlay).toBeNull();
        expect(next.currentPlayerSeat).toBe(0);
        expect(next.leadSeat).toBe(0);
        next = play(next, 0, ["S4", "H4"]);
        expect(next.lastPlay?.kind).toBe("pair");
    });

    test("cannot play a pair on a single", () => {
        const state = handsWithControl({
            0: ["D3", "S5", "D5", "D6", "D7", "D8", "D9", "D10", "DJ", "DQ", "DK", "DA", "H5"],
            3: ["C4", "H4", "C6", "C7", "C8", "C9", "C10", "CJ", "CQ", "CK", "CA", "C2", "H3"],
        });
        const opened = play(state, 0, ["D3"]);
        const result = tryPlay(opened, 3, ["C4", "H4"]);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.code).toBe("illegalPlay");
        }
    });
});

describe("special rules", () => {
    test("dragon wins immediately", () => {
        const ranks = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2"] as const;
        const dragon = ranks.map((rank, i) => parseCardId(`${["D", "C", "H", "S"][i % 4]}${rank}`));
        expect(hasDragon(dragon)).toBe(true);
        const rest = createDeck().filter(card => !dragon.some(item => item.id === card.id));
        const state = createGameFromHands({
            players: TEST_PLAYERS,
            hands: [sortCards(dragon), sortCards(rest.slice(0, 13)), sortCards(rest.slice(13, 26)), sortCards(rest.slice(26, 39))],
        });
        expect(state.phase).toBe("roundEnded");
        expect(state.dragonWin).toBe(true);
        expect(state.winnerSeat).toBe(0);
        expect(state.players.map(player => player.score)).toEqual([0, 39, 39, 39]);
    });

    test("cannot finish with a single spade 2", () => {
        const state = handsWithControl({
            0: ["D3", "S2", "D5", "D6", "D7", "D8", "D9", "D10", "DJ", "DQ", "DK", "DA", "H5"],
        });
        expect(state.phase).toBe("playing");
        expect(state.hands[0].map(card => card.id)).toEqual(c("D3", "S2", "D5", "D6", "D7", "D8", "D9", "D10", "DJ", "DQ", "DK", "DA", "H5").map(card => card.id));
        let next = play(state, 0, ["D3"]);
        next = pass(next, 3);
        next = pass(next, 2);
        next = pass(next, 1);
        for (const id of ["D5", "D6", "D7", "D8", "D9", "D10", "DJ", "DQ", "DK", "DA", "H5"]) {
            next = play(next, 0, [id]);
            next = pass(next, 3);
            next = pass(next, 2);
            next = pass(next, 1);
        }
        expect(next.hands[0].map(card => card.id)).toEqual(["S2"]);
        const result = tryPlay(next, 0, ["S2"]);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.code).toBe("spadeTwoLastSingle");
        }
    });

    test("emptying the hand ends the round immediately", () => {
        const state = handsWithControl({
            0: ["D3", "S4", "D5", "D6", "D7", "D8", "D9", "D10", "DJ", "DQ", "DK", "DA", "H4"],
        });
        let next = play(state, 0, ["D3"]);
        expect(next.phase).toBe("playing");
        next = pass(next, 3);
        next = pass(next, 2);
        next = pass(next, 1);
        const rest = next.hands[0].map(card => card.id);
        for (let i = 0; i < rest.length; i += 1) {
            next = play(next, 0, [rest[i]]);
            if (i < rest.length - 1) {
                next = pass(next, 3);
                next = pass(next, 2);
                next = pass(next, 1);
            }
        }
        expect(next.phase).toBe("roundEnded");
        expect(next.winnerSeat).toBe(0);
        expect(next.penalties[0]).toBe(0);
    });
});

describe("engine guards", () => {
    test("rejects stale revision and duplicate commands", () => {
        const state = createGame({players: TEST_PLAYERS, seed: "guard-1"});
        if (state.dragonWin) {
            return;
        }
        const seat = state.currentPlayerSeat;
        const d3 = state.hands[seat].find(card => card.id === "D3")!;
        const action = {
            type: "playCards" as const,
            playerId: state.players[seat].id,
            commandId: "cmd-1",
            revision: state.revision,
            cardIds: [d3.id],
        };
        const first = applyAction(state, action);
        expect(first.ok).toBe(true);
        const dup = applyAction(first.ok ? first.state : state, action);
        expect(dup.ok).toBe(false);
        if (!dup.ok) {
            expect(dup.error.code).toBe("duplicateCommand");
        }
        const stale = applyAction(first.ok ? first.state : state, {...action, commandId: "cmd-2", revision: state.revision});
        expect(stale.ok).toBe(false);
        if (!stale.ok) {
            expect(stale.error.code).toBe("staleRevision");
        }
    });

    test("rejects the wrong player", () => {
        const state = createGame({players: TEST_PLAYERS, seed: "guard-2"});
        if (state.dragonWin) {
            return;
        }
        const other = (state.currentPlayerSeat + 1) % 4;
        const result = tryPass(state, other);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.code).toBe("notYourTurn");
        }
    });

    test("leader cannot pass if a legal play exists", () => {
        const state = handsWithControl({
            0: ["D3", "S4", "D5", "D6", "D7", "D8", "D9", "D10", "DJ", "DQ", "DK", "DA", "H4"],
        });
        const result = tryPass(state, 0);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.code).toBe("mustPlay");
        }
    });
});
