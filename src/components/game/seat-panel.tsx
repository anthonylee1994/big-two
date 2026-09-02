import React from "react";
import {FaForward, FaRobot} from "react-icons/fa6";
import {LuWifiOff} from "react-icons/lu";
import type {PublicPlayer} from "../../game/domain/types.ts";
import {PlayingCard} from "../playing-card.tsx";

const SLOT_CLASS: Record<string, string> = {
    left: "seat-slot-left",
    top: "seat-slot-top",
    right: "seat-slot-right",
};

const BACK_CARD = {id: "back", suit: "spade", rank: "3"} as const;

export const SeatPanel = React.memo((props: {player: PublicPlayer; active: boolean; passed: boolean; slot: "left" | "top" | "right"}) => {
    const isBot = props.player.type === "bot";
    const offline = props.player.connectionStatus === "disconnected";
    const backs = Math.min(props.player.remainingCount, 4);

    return (
        <div
            className={`${SLOT_CLASS[props.slot]} seat-panel panel flex flex-col items-center gap-1.5 px-2 py-2.5 text-center transition-colors sm:px-3 ${
                props.active ? "border-gold-500 bg-felt-700" : ""
            }`}
        >
            <div
                className={`seat-avatar border-felt-950 flex size-10 flex-none items-center justify-center rounded-2xl border-3 text-base font-black md:size-12 md:text-lg ${
                    props.active ? "bg-gold-400 text-felt-950 animate-turn" : "bg-felt-700 text-white/85"
                } ${offline ? "opacity-45" : ""}`}
            >
                {isBot ? <FaRobot aria-hidden="true" /> : props.player.name.slice(0, 1)}
            </div>

            <p className="w-full truncate text-xs font-bold text-white/90 sm:text-sm">{props.player.name}</p>

            <div className="flex flex-wrap items-center justify-center gap-1">
                <span className="border-felt-950 bg-felt-950 text-gold-400 rounded-full border-2 px-2 py-0.5 text-[0.7rem] font-black whitespace-nowrap tabular-nums">
                    {props.player.remainingCount} 張
                </span>
                {offline ? (
                    <span className="border-cherry-700 bg-cherry-500 inline-flex items-center gap-1 rounded-full border-2 px-2 py-0.5 text-[0.65rem] font-bold text-white">
                        <LuWifiOff aria-hidden="true" />
                        斷線
                    </span>
                ) : null}
                {props.passed ? (
                    <span className="border-felt-950 bg-felt-700 inline-flex items-center gap-1 rounded-full border-2 px-2 py-0.5 text-[0.65rem] font-bold text-white/70">
                        <FaForward aria-hidden="true" />
                        Pass
                    </span>
                ) : null}
            </div>

            <div className="card-stack card-xs hidden md:flex" aria-hidden="true">
                {Array.from({length: backs}).map((_, index) => (
                    <PlayingCard key={index} card={BACK_CARD} face="down" size="fan" />
                ))}
            </div>
        </div>
    );
});
