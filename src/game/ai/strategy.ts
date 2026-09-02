import {rankValue} from "../domain/cards.ts";
import {combinationLength, enumerateCombinations, fourOfAKindRank, fullHouseTripleRank, identifyCombination, straightRankIndex} from "../domain/combination.ts";
import type {Card, Combination, PublicGameState} from "../domain/types.ts";
import {isLegalPlay, listLegalPlays} from "../engine/legal.ts";

export type AiDecision = {type: "play"; cardIds: string[]} | {type: "pass"};

export interface AiInput {
    hand: Card[];
    snapshot: PublicGameState;
}

function cardSet(cards: Card[]): Set<string> {
    return new Set(cards.map(card => card.id));
}

function usesCards(combination: Combination, ids: Set<string>): boolean {
    return combination.cards.some(card => ids.has(card.id));
}

function valuableCombos(hand: Card[]): Combination[] {
    return enumerateCombinations(hand).filter(
        combo => combo.kind === "fullHouse" || combo.kind === "fourOfAKind" || combo.kind === "straightFlush" || combo.kind === "straight" || combo.kind === "flush"
    );
}

function breaksValuable(valuables: Combination[], play: Combination): boolean {
    if (play.cards.length === 5 && (play.kind === "fullHouse" || play.kind === "fourOfAKind" || play.kind === "straightFlush")) {
        return false;
    }
    const used = cardSet(play.cards);
    return valuables.some(combo => combo.kind !== play.kind && usesCards(combo, used));
}

function playStrength(play: Combination): number {
    const high = play.cards.reduce((max, card) => Math.max(max, rankValue(card.rank)), 0);
    return combinationLength(play.kind) * 20 + high;
}

function leadScore(valuables: Combination[], play: Combination, opponentMin: number, handSize: number): number {
    let score = play.cards.length * 12 - play.cards.reduce((sum, card) => sum + rankValue(card.rank), 0);
    if (breaksValuable(valuables, play)) {
        score -= 40;
    }
    if (play.cards.some(card => card.rank === "2") && handSize > 4) {
        score -= 18;
    }
    if (opponentMin <= 2 && play.cards.length !== opponentMin) {
        score += 8;
    }
    return score;
}

function smallestPlay(plays: Combination[]): Combination {
    return [...plays].sort((a, b) => playStrength(a) - playStrength(b) || a.cards[0].id.localeCompare(b.cards[0].id))[0];
}

export function chooseAction(input: AiInput): AiDecision {
    const {hand, snapshot} = input;
    const ctx = {
        lastPlay: snapshot.lastPlay,
        mustIncludeDiamond3: snapshot.mustIncludeDiamond3 && snapshot.currentPlayerSeat === snapshot.ownSeat,
    };
    const legal = listLegalPlays(hand, ctx);
    if (legal.length === 0) {
        return {type: "pass"};
    }

    const opponentMin = snapshot.players.filter(player => player.seat !== snapshot.ownSeat).reduce((min, player) => Math.min(min, player.remainingCount), 13);
    const isLead = snapshot.lastPlay === null;
    const valuables = valuableCombos(hand);

    if (!isLead) {
        const cheap = legal.filter(play => !breaksValuable(valuables, play));
        const pool = cheap.length > 0 && opponentMin > 2 ? cheap : legal;
        if (opponentMin > 2) {
            const precious = pool.filter(play => play.cards.some(card => card.rank === "2") || play.kind === "fourOfAKind" || play.kind === "straightFlush");
            const ordinary = pool.filter(play => !precious.includes(play));
            if (ordinary.length > 0) {
                const chosen = smallestPlay(ordinary);
                return {type: "play", cardIds: chosen.cards.map(card => card.id)};
            }
        }
        const chosen = smallestPlay(pool);
        return {type: "play", cardIds: chosen.cards.map(card => card.id)};
    }

    const ranked = [...legal].sort((a, b) => leadScore(valuables, b, opponentMin, hand.length) - leadScore(valuables, a, opponentMin, hand.length));
    const chosen = ranked[0];
    if (!isLegalPlay(chosen, ctx)) {
        return {type: "pass"};
    }
    return {type: "play", cardIds: chosen.cards.map(card => card.id)};
}

export function isPlayStillLegal(hand: Card[], cardIds: string[], snapshot: PublicGameState): boolean {
    const cards = hand.filter(card => cardIds.includes(card.id));
    if (cards.length !== cardIds.length) {
        return false;
    }
    const combination = identifyCombination(cards);
    if (!combination) {
        return false;
    }
    return isLegalPlay(combination, {
        lastPlay: snapshot.lastPlay,
        mustIncludeDiamond3: snapshot.mustIncludeDiamond3,
    });
}

export function debugComboValue(combination: Combination): number {
    if (combination.kind === "fourOfAKind") {
        return rankValue(fourOfAKindRank(combination.cards)!);
    }
    if (combination.kind === "fullHouse") {
        return rankValue(fullHouseTripleRank(combination.cards)!);
    }
    if (combination.kind === "straight" || combination.kind === "straightFlush") {
        return straightRankIndex(combination.cards);
    }
    return 0;
}
