import React from "react";

export const Segmented = React.memo((props: {value: string; options: {value: string; label: string}[]; onChange: (value: string) => void; ariaLabel?: string; block?: boolean}) => {
    const block = props.block ? "flex w-full" : "inline-flex";
    return (
        <div role="radiogroup" aria-label={props.ariaLabel} className={`${block} border-felt-950 bg-felt-800 rounded-2xl border-3 p-1`}>
            {props.options.map(option => {
                const active = option.value === props.value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => props.onChange(option.value)}
                        className={`min-h-10 flex-1 rounded-xl px-4 text-sm font-black transition-colors ${active ? "bg-gold-500 text-felt-950" : "text-white/60 hover:text-white"}`}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
});
