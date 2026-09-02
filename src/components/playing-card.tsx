import React from "react";
import {cardLabel, isRedSuit, SUIT_SYMBOLS} from "../game/domain/cards.ts";
import type {Card} from "../game/domain/types.ts";

export type CardSize = "xs" | "sm" | "md" | "lg" | "fan";

const SIZE_CLASS: Record<CardSize, string> = {
    xs: "card-xs",
    sm: "card-sm",
    md: "card-md",
    lg: "card-lg",
    fan: "",
};

export const PlayingCard = React.memo((props: {card: Card; selected?: boolean; dimmed?: boolean; onToggle?: (id: string) => void; face?: "up" | "down"; size?: CardSize}) => {
    const size = SIZE_CLASS[props.size ?? "md"];

    if (props.face === "down") {
        return (
            <div className={`playing-card playing-card-back ${size} flex items-center justify-center`} aria-hidden="true">
                <span className="playing-card-mark border-felt-950 bg-gold-500 text-felt-950 flex aspect-square w-[62%] items-center justify-center rounded-full border-3 font-black">大</span>
            </div>
        );
    }

    const ink = isRedSuit(props.card.suit) ? "text-cherry-600" : "text-felt-950";
    const selected = props.selected ? "playing-card-selected" : "";
    const dimmed = props.dimmed ? "opacity-45 saturate-50" : "";
    const interactive = props.onToggle ? "playing-card-interactive" : "";
    const symbol = SUIT_SYMBOLS[props.card.suit];

    const content = (
        <React.Fragment>
            <span className={`absolute top-[6%] left-[7%] flex flex-col items-center ${ink}`}>
                <span className="playing-card-rank font-bold">{props.card.rank}</span>
                <span className="playing-card-suit">{symbol}</span>
            </span>
            <span className={`playing-card-ghost absolute right-[4%] bottom-[2%] opacity-20 ${ink}`} aria-hidden="true">
                {symbol}
            </span>
        </React.Fragment>
    );

    if (!props.onToggle) {
        return (
            <div className={`playing-card playing-card-face ${size} ${dimmed}`} role="img" aria-label={cardLabel(props.card)}>
                {content}
            </div>
        );
    }

    return (
        <button
            type="button"
            aria-label={cardLabel(props.card)}
            aria-pressed={props.selected ?? false}
            onClick={() => props.onToggle?.(props.card.id)}
            className={`playing-card playing-card-face ${size} ${selected} ${dimmed} ${interactive} block text-left`}
        >
            {content}
        </button>
    );
});
