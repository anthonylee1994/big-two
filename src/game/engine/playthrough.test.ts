import {describe, expect, test} from "vitest";
import {chooseAction} from "../ai/strategy.ts";
import {TEST_PLAYERS} from "../test-helpers.ts";
import {applyAction, createGame} from "./reducer.ts";
import {listLegalPlays, playContextFor} from "./legal.ts";
import {toPublicSnapshot} from "./snapshot.ts";
import {penaltyForCount} from "./scoring.ts";

describe("full playthrough", () => {
    test("four bots can finish a round without deadlock or illegal plays", () => {
        let state = createGame({players: TEST_PLAYERS.map((player, index) => ({...player, type: index === 0 ? "human" : "bot"})), seed: "play-42"});
        let steps = 0;
        while (state.phase === "playing") {
            steps += 1;
            expect(steps).toBeLessThan(400);
            const seat = state.currentPlayerSeat;
            const player = state.players[seat];
            const snapshot = toPublicSnapshot(state, player.id);
            const decision = chooseAction({hand: state.hands[seat], snapshot});
            const legal = listLegalPlays(state.hands[seat], playContextFor(state, seat));
            if (decision.type === "play") {
                expect(legal.some(item => item.cards.length === decision.cardIds.length && item.cards.every(card => decision.cardIds.includes(card.id)))).toBe(true);
            }
            const result = applyAction(
                state,
                decision.type === "play"
                    ? {type: "playCards", playerId: player.id, commandId: `ai-${steps}`, revision: state.revision, cardIds: decision.cardIds}
                    : {type: "pass", playerId: player.id, commandId: `ai-${steps}`, revision: state.revision}
            );
            expect(result.ok).toBe(true);
            if (!result.ok) {
                throw new Error(result.error.message);
            }
            state = result.state;
        }
        expect(state.phase).toBe("roundEnded");
        expect(state.winnerSeat).not.toBeNull();
        expect(state.hands[state.winnerSeat!]).toHaveLength(0);
        for (let seat = 0; seat < 4; seat += 1) {
            const expected = seat === state.winnerSeat ? 0 : penaltyForCount(state.hands[seat].length);
            expect(state.penalties[seat]).toBe(expected);
            expect(state.players[seat].score).toBe(expected);
        }
    });

    test("next round reshuffles and keeps cumulative scores", () => {
        let state = createGame({players: TEST_PLAYERS, seed: "round-a"});
        let steps = 0;
        while (state.phase === "playing") {
            steps += 1;
            const seat = state.currentPlayerSeat;
            const player = state.players[seat];
            const decision = chooseAction({hand: state.hands[seat], snapshot: toPublicSnapshot(state, player.id)});
            const result = applyAction(
                state,
                decision.type === "play"
                    ? {type: "playCards", playerId: player.id, commandId: `r1-${steps}`, revision: state.revision, cardIds: decision.cardIds}
                    : {type: "pass", playerId: player.id, commandId: `r1-${steps}`, revision: state.revision}
            );
            if (!result.ok) {
                throw new Error(result.error.message);
            }
            state = result.state;
        }
        const firstScores = state.players.map(player => player.score);
        const next = applyAction(state, {type: "startRound", playerId: state.players[0].id, commandId: "next", revision: state.revision, seed: "round-b"});
        expect(next.ok).toBe(true);
        if (!next.ok) {
            return;
        }
        expect(next.state.round).toBe(2);
        expect(next.state.players.map(player => player.score)).toEqual(firstScores);
        expect(next.state.hands.flat()).toHaveLength(52);
    });
});
