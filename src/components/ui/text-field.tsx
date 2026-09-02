import React from "react";

export const TextField = React.memo(
    (props: {label: string; value: string; onChange: (value: string) => void; placeholder?: string; maxLength?: number; hint?: string; mono?: boolean; transform?: "upper" | "none"}) => {
        const mono = props.mono ? "font-mono tracking-[0.35em] uppercase" : "";
        return (
            <label className="block">
                <span className="mb-1.5 block text-xs font-black tracking-wider text-white/60 uppercase">{props.label}</span>
                <input
                    value={props.value}
                    onChange={event => props.onChange(props.transform === "upper" ? event.target.value.toUpperCase() : event.target.value)}
                    placeholder={props.placeholder}
                    maxLength={props.maxLength}
                    className={`border-felt-950 bg-felt-800 focus:border-gold-500 h-13 w-full rounded-2xl border-3 px-3.5 font-bold text-white placeholder:text-white/30 focus:outline-none ${mono}`}
                />
                {props.hint ? <span className="mt-1.5 block text-xs font-semibold text-white/45">{props.hint}</span> : null}
            </label>
        );
    }
);
