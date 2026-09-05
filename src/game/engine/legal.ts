import {DIAMOND_3_ID, sortCards} from "../domain/cards.ts";
import {beats, enumerateCombinations, identifyCombination} from "../domain/combination.ts";
import type {Card, Combination, GameState, Seat} from "../domain/types.ts";

export interface PlayContext {
    lastPlay: Combination | null;
    mustIncludeDiamond3: boolean;
}

export function cardsFromIds(hand: Card[], cardIds: string[]): Card[] | null {
    if (new Set(cardIds).size !== cardIds.length) {
        return null;
    }
    const byId = new Map(hand.map(card => [card.id, card]));
    const cards: Card[] = [];
    for (const id of cardIds) {
        const card = byId.get(id);
        if (!card) {
            return null;
        }
        cards.push(card);
    }
    return cards;
}

export function isLegalPlay(combination: Combination, ctx: PlayContext): boolean {
    if (ctx.mustIncludeDiamond3 && !combination.cards.some(card => card.id === DIAMOND_3_ID)) {
        return false;
    }
    if (ctx.lastPlay && !beats(combination, ctx.lastPlay)) {
        return false;
    }
    return true;
}

export function listLegalPlays(hand: Card[], ctx: PlayContext): Combination[] {
    return enumerateCombinations(hand).filter(combination => isLegalPlay(combination, ctx));
}

export function playContextFor(state: GameState, _seat: Seat): PlayContext {
    return {
        lastPlay: state.lastPlay,
        mustIncludeDiamond3: state.mustIncludeDiamond3,
    };
}

export function selectedPlay(hand: Card[], cardIds: string[]): Combination | null {
    const cards = cardsFromIds(hand, cardIds);
    if (!cards) {
        return null;
    }
    return identifyCombination(sortCards(cards));
}
