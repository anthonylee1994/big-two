import {compareCard, highestCard, rankValue, sortCards, suitValue} from "./cards.ts";
import type {Card, Combination, CombinationKind, Rank} from "./types.ts";

export const FIVE_CARD_KIND_RANK: Record<Extract<CombinationKind, "straight" | "flush" | "fullHouse" | "fourOfAKind" | "straightFlush">, number> = {
    straight: 1,
    flush: 2,
    fullHouse: 3,
    fourOfAKind: 4,
    straightFlush: 5,
};

export const STRAIGHT_RANK_SETS: Rank[][] = [
    ["A", "2", "3", "4", "5"],
    ["2", "3", "4", "5", "6"],
    ["10", "J", "Q", "K", "A"],
    ["9", "10", "J", "Q", "K"],
    ["8", "9", "10", "J", "Q"],
    ["7", "8", "9", "10", "J"],
    ["6", "7", "8", "9", "10"],
    ["5", "6", "7", "8", "9"],
    ["4", "5", "6", "7", "8"],
    ["3", "4", "5", "6", "7"],
];

export function combinationsOf<T>(items: T[], k: number): T[][] {
    if (k === 0) {
        return [[]];
    }
    if (k > items.length) {
        return [];
    }
    const result: T[][] = [];
    function walk(start: number, chosen: T[]): void {
        if (chosen.length === k) {
            result.push([...chosen]);
            return;
        }
        const remaining = k - chosen.length;
        for (let i = start; i <= items.length - remaining; i += 1) {
            chosen.push(items[i]);
            walk(i + 1, chosen);
            chosen.pop();
        }
    }
    walk(0, []);
    return result;
}

export function rankCounts(cards: Card[]): Map<Rank, number> {
    const counts = new Map<Rank, number>();
    for (const card of cards) {
        counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1);
    }
    return counts;
}

export function isFlush(cards: Card[]): boolean {
    return cards.length > 0 && cards.every(card => card.suit === cards[0].suit);
}

export function straightRankIndex(cards: Card[]): number {
    if (cards.length !== 5) {
        return -1;
    }
    const ranks = new Set(cards.map(card => card.rank));
    if (ranks.size !== 5) {
        return -1;
    }
    return STRAIGHT_RANK_SETS.findIndex(group => group.every(rank => ranks.has(rank)));
}

export function straightCompareCard(cards: Card[]): Card {
    const index = straightRankIndex(cards);
    if (index === 0) {
        return cards.find(card => card.rank === "5")!;
    }
    if (index === 1) {
        return cards.find(card => card.rank === "6")!;
    }
    return highestCard(cards);
}

export function fourOfAKindRank(cards: Card[]): Rank | null {
    for (const [rank, count] of rankCounts(cards)) {
        if (count === 4) {
            return rank;
        }
    }
    return null;
}

export function fullHouseTripleRank(cards: Card[]): Rank | null {
    const counts = rankCounts(cards);
    let triple: Rank | null = null;
    let pair: Rank | null = null;
    for (const [rank, count] of counts) {
        if (count === 3) {
            triple = rank;
        } else if (count === 2) {
            pair = rank;
        }
    }
    return triple !== null && pair !== null ? triple : null;
}

export function identifyCombination(cards: Card[]): Combination | null {
    const sorted = sortCards(cards);
    if (sorted.length === 1) {
        return {kind: "single", cards: sorted};
    }
    if (sorted.length === 2) {
        return sorted[0].rank === sorted[1].rank ? {kind: "pair", cards: sorted} : null;
    }
    if (sorted.length === 3) {
        return sorted[0].rank === sorted[1].rank && sorted[1].rank === sorted[2].rank ? {kind: "triple", cards: sorted} : null;
    }
    if (sorted.length !== 5) {
        return null;
    }

    const flush = isFlush(sorted);
    const straightIndex = straightRankIndex(sorted);
    const isStraight = straightIndex >= 0;

    if (isStraight && flush) {
        return {kind: "straightFlush", cards: sorted};
    }
    if (fourOfAKindRank(sorted)) {
        return {kind: "fourOfAKind", cards: sorted};
    }
    if (fullHouseTripleRank(sorted)) {
        return {kind: "fullHouse", cards: sorted};
    }
    if (flush) {
        return {kind: "flush", cards: sorted};
    }
    if (isStraight) {
        return {kind: "straight", cards: sorted};
    }
    return null;
}

export function compareSameKind(a: Combination, b: Combination): number {
    switch (a.kind) {
        case "single":
            return compareCard(a.cards[0], b.cards[0]);
        case "pair": {
            const rankDiff = rankValue(a.cards[0].rank) - rankValue(b.cards[0].rank);
            if (rankDiff !== 0) {
                return rankDiff;
            }
            return suitValue(highestCard(a.cards).suit) - suitValue(highestCard(b.cards).suit);
        }
        case "triple":
            return rankValue(a.cards[0].rank) - rankValue(b.cards[0].rank);
        case "straight": {
            const aIndex = straightRankIndex(a.cards);
            const bIndex = straightRankIndex(b.cards);
            if (aIndex !== bIndex) {
                return bIndex - aIndex;
            }
            return suitValue(straightCompareCard(a.cards).suit) - suitValue(straightCompareCard(b.cards).suit);
        }
        case "straightFlush": {
            const aIndex = straightRankIndex(a.cards);
            const bIndex = straightRankIndex(b.cards);
            if (aIndex !== bIndex) {
                return bIndex - aIndex;
            }
            return suitValue(a.cards[0].suit) - suitValue(b.cards[0].suit);
        }
        case "flush": {
            const aHigh = highestCard(a.cards);
            const bHigh = highestCard(b.cards);
            const rankDiff = rankValue(aHigh.rank) - rankValue(bHigh.rank);
            if (rankDiff !== 0) {
                return rankDiff;
            }
            return suitValue(aHigh.suit) - suitValue(bHigh.suit);
        }
        case "fullHouse":
            return rankValue(fullHouseTripleRank(a.cards)!) - rankValue(fullHouseTripleRank(b.cards)!);
        case "fourOfAKind":
            return rankValue(fourOfAKindRank(a.cards)!) - rankValue(fourOfAKindRank(b.cards)!);
    }
}

export function combinationLength(kind: CombinationKind): number {
    if (kind === "single") {
        return 1;
    }
    if (kind === "pair") {
        return 2;
    }
    if (kind === "triple") {
        return 3;
    }
    return 5;
}

export function beats(next: Combination, last: Combination): boolean {
    if (next.cards.length !== last.cards.length) {
        return false;
    }
    if (next.cards.length === 5) {
        const nextRank = FIVE_CARD_KIND_RANK[next.kind as keyof typeof FIVE_CARD_KIND_RANK];
        const lastRank = FIVE_CARD_KIND_RANK[last.kind as keyof typeof FIVE_CARD_KIND_RANK];
        if (nextRank !== lastRank) {
            return nextRank > lastRank;
        }
        return compareSameKind(next, last) > 0;
    }
    if (next.kind !== last.kind) {
        return false;
    }
    return compareSameKind(next, last) > 0;
}

export function enumerateCombinations(hand: Card[]): Combination[] {
    const result: Combination[] = [];
    for (const card of hand) {
        result.push({kind: "single", cards: [card]});
    }

    const byRank = new Map<Rank, Card[]>();
    for (const card of hand) {
        const group = byRank.get(card.rank) ?? [];
        group.push(card);
        byRank.set(card.rank, group);
    }
    for (const group of byRank.values()) {
        if (group.length >= 2) {
            for (const pair of combinationsOf(group, 2)) {
                result.push({kind: "pair", cards: sortCards(pair)});
            }
        }
        if (group.length >= 3) {
            for (const triple of combinationsOf(group, 3)) {
                result.push({kind: "triple", cards: sortCards(triple)});
            }
        }
    }

    for (const five of combinationsOf(hand, 5)) {
        const identified = identifyCombination(five);
        if (identified) {
            result.push(identified);
        }
    }
    return result;
}

export function combinationKey(combination: Combination): string {
    return `${combination.kind}:${combination.cards.map(card => card.id).join(",")}`;
}
