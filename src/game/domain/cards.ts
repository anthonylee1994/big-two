import type {Card, Rank, Seat, Suit} from "./types.ts";

export const SUITS: Suit[] = ["diamond", "club", "heart", "spade"];
export const RANKS: Rank[] = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2"];

export const SUIT_CHARS: Record<Suit, string> = {
    diamond: "D",
    club: "C",
    heart: "H",
    spade: "S",
};

export const SUIT_SYMBOLS: Record<Suit, string> = {
    diamond: "♦",
    club: "♣",
    heart: "♥",
    spade: "♠",
};

export const SUIT_NAMES: Record<Suit, string> = {
    diamond: "方塊",
    club: "梅花",
    heart: "紅心",
    spade: "葵扇",
};

export const RANK_NAMES: Record<Rank, string> = {
    "3": "3",
    "4": "4",
    "5": "5",
    "6": "6",
    "7": "7",
    "8": "8",
    "9": "9",
    "10": "10",
    J: "J",
    Q: "Q",
    K: "K",
    A: "A",
    "2": "2",
};

export const DIAMOND_3_ID = "D3";
export const SPADE_2_ID = "S2";

const SUIT_BY_CHAR: Record<string, Suit> = {
    D: "diamond",
    C: "club",
    H: "heart",
    S: "spade",
};

export function rankValue(rank: Rank): number {
    return RANKS.indexOf(rank);
}

export function suitValue(suit: Suit): number {
    return SUITS.indexOf(suit);
}

export function cardId(suit: Suit, rank: Rank): string {
    return `${SUIT_CHARS[suit]}${rank}`;
}

export function parseCardId(id: string): Card {
    const suit = SUIT_BY_CHAR[id[0]];
    const rank = id.slice(1) as Rank;
    if (!suit || !RANKS.includes(rank)) {
        throw new Error(`Invalid card id: ${id}`);
    }
    return {id, suit, rank};
}

export function createDeck(): Card[] {
    const cards: Card[] = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            cards.push({id: cardId(suit, rank), suit, rank});
        }
    }
    return cards;
}

export function compareCard(a: Card, b: Card): number {
    const rankDiff = rankValue(a.rank) - rankValue(b.rank);
    if (rankDiff !== 0) {
        return rankDiff;
    }
    return suitValue(a.suit) - suitValue(b.suit);
}

export function sortCards(cards: Card[]): Card[] {
    return [...cards].sort(compareCard);
}

export function highestCard(cards: Card[]): Card {
    return sortCards(cards)[cards.length - 1];
}

export function cardLabel(card: Card): string {
    return `${SUIT_NAMES[card.suit]} ${RANK_NAMES[card.rank]}`;
}

export function nextSeat(seat: Seat): Seat {
    return ((seat + 3) % 4) as Seat;
}

export function displaySeat(seat: Seat, ownSeat: Seat): Seat {
    return ((seat - ownSeat + 4) % 4) as Seat;
}

export function isRedSuit(suit: Suit): boolean {
    return suit === "diamond" || suit === "heart";
}
