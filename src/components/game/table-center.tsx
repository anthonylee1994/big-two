import React from "react";
import type {Combination} from "../../game/domain/types.ts";
import {KIND_NAMES} from "../../game/domain/labels.ts";
import {PlayingCard} from "../playing-card.tsx";

export const TableCenter = React.memo((props: {round: number; turnLabel: string; myTurn: boolean; lastPlay: Combination | null; hintLabel: string}) => {
    return (
        <section className="table-center felt flex min-h-0 flex-col items-center justify-center gap-2 overflow-hidden px-2 py-2 sm:gap-3 sm:px-6 sm:py-4">
            <p className="table-round text-felt-950 text-xs font-black tracking-[0.2em] uppercase sm:text-xl sm:tracking-[0.3em]">第 {props.round} 局</p>

            <p
                className={`turn-pill border-felt-950 rounded-full border-3 px-3 py-1 text-xs font-black sm:px-5 sm:py-2 sm:text-base ${
                    props.myTurn ? "bg-gold-500 text-felt-950 animate-bob shadow-[0_4px_0_var(--color-felt-950)]" : "bg-felt-700 text-white/85"
                }`}
            >
                {props.turnLabel}
            </p>

            <div className="table-drop flex min-h-[max(3rem,8vh)] items-center justify-center sm:min-h-[max(3.5rem,12vh)]">
                {props.lastPlay ? (
                    <div className="card-stack card-sm animate-rise">
                        {props.lastPlay.cards.map(card => (
                            <PlayingCard key={card.id} card={card} size="sm" />
                        ))}
                    </div>
                ) : (
                    <div
                        className="card-md border-felt-950/40 text-felt-950/40 flex aspect-5/7 w-(--card-w) items-center justify-center rounded-2xl border-3 border-dashed text-2xl font-black"
                        aria-hidden="true"
                    >
                        ?
                    </div>
                )}
            </div>

            <p className="text-felt-950 text-center text-xs font-black sm:text-xl">{props.lastPlay ? KIND_NAMES[props.lastPlay.kind] : props.hintLabel}</p>
        </section>
    );
});
