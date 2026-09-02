import {createDeck, parseCardId, sortCards} from "./domain/cards.ts";
import type {Card, Combination, GameState, PlayerInit} from "./domain/types.ts";
import {applyAction, createGame} from "./engine/reducer.ts";
import {shuffle} from "./engine/shuffle.ts";

export const TEST_PLAYERS: PlayerInit[] = [
    {id: "p0", name: "P0", type: "human"},
    {id: "p1", name: "P1", type: "bot"},
    {id: "p2", name: "P2", type: "bot"},
    {id: "p3", name: "P3", type: "bot"},
];

export function c(...ids: string[]): Card[] {
    return sortCards(ids.map(id => parseCardId(id)));
}

export function card(id: string): Card {
    return parseCardId(id);
}

export function combo(kind: Combination["kind"], ...ids: string[]): Combination {
    return {kind, cards: c(...ids)};
}

export function playersAt(state: GameState, seat: number): PlayerInit {
    return {id: state.players[seat].id, name: state.players[seat].name, type: state.players[seat].type};
}

export function play(state: GameState, seat: number, cardIds: string[]): GameState {
    const result = applyAction(state, {
        type: "playCards",
        playerId: state.players[seat].id,
        commandId: `play-${state.revision}-${cardIds.join("-")}`,
        revision: state.revision,
        cardIds,
    });
    if (!result.ok) {
        throw new Error(`${result.error.code}: ${result.error.message}`);
    }
    return result.state;
}

export function pass(state: GameState, seat: number): GameState {
    const result = applyAction(state, {
        type: "pass",
        playerId: state.players[seat].id,
        commandId: `pass-${state.revision}-${seat}`,
        revision: state.revision,
    });
    if (!result.ok) {
        throw new Error(`${result.error.code}: ${result.error.message}`);
    }
    return result.state;
}

export function tryPlay(state: GameState, seat: number, cardIds: string[]) {
    return applyAction(state, {
        type: "playCards",
        playerId: state.players[seat].id,
        commandId: `try-${state.revision}-${cardIds.join("-")}`,
        revision: state.revision,
        cardIds,
    });
}

export function tryPass(state: GameState, seat: number) {
    return applyAction(state, {
        type: "pass",
        playerId: state.players[seat].id,
        commandId: `try-pass-${state.revision}-${seat}`,
        revision: state.revision,
    });
}

export function dealBySeed(seed: string): Card[][] {
    const deck = shuffle(createDeck(), seed);
    return [sortCards(deck.slice(0, 13)), sortCards(deck.slice(13, 26)), sortCards(deck.slice(26, 39)), sortCards(deck.slice(39, 52))];
}

export function gameWithHands(hands: Card[][]): GameState {
    return createGame({players: TEST_PLAYERS, seed: "hands", deck: hands.flat()});
}

export function moveCard(hands: Card[][], fromSeat: number, toSeat: number, id: string): Card[][] {
    const next = hands.map(hand => [...hand]);
    const index = next[fromSeat].findIndex(item => item.id === id);
    if (index < 0) {
        throw new Error(`Card ${id} not in seat ${fromSeat}`);
    }
    const [moved] = next[fromSeat].splice(index, 1);
    next[toSeat].push(moved);
    return next.map(hand => sortCards(hand));
}
