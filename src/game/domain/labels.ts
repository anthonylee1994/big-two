import {cardLabel, SUIT_SYMBOLS} from "./cards.ts";
import type {Combination, CombinationKind} from "./types.ts";

export const KIND_NAMES: Record<CombinationKind, string> = {
    single: "單牌",
    pair: "對子",
    triple: "三條",
    straight: "蛇",
    flush: "花",
    fullHouse: "夫佬",
    fourOfAKind: "四條",
    straightFlush: "同花順",
};

export function combinationLabel(combination: Combination): string {
    const cards = combination.cards.map(card => `${SUIT_SYMBOLS[card.suit]}${card.rank}`).join(" ");
    return `${KIND_NAMES[combination.kind]} ${cards}`;
}

export function cardText(combination: Combination): string {
    return combination.cards.map(card => cardLabel(card)).join("、");
}
