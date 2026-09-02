import React from "react";
import type {Card} from "../../game/domain/types.ts";
import {PlayingCard} from "../playing-card.tsx";

export const HandFan = React.memo((props: {cards: Card[]; selectedIds: string[]; onToggle: (id: string) => void}) => {
    return (
        <div className="hand-fan card-lg" style={{"--card-count": props.cards.length} as React.CSSProperties}>
            {props.cards.map((card, index) => {
                const selected = props.selectedIds.includes(card.id);
                return (
                    <div key={card.id} style={{zIndex: selected ? 50 + index : index}}>
                        <PlayingCard card={card} size="fan" selected={selected} onToggle={props.onToggle} />
                    </div>
                );
            })}
        </div>
    );
});
