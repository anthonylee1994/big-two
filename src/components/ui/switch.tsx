import React from "react";

export const Switch = React.memo((props: {label: string; description?: string; icon?: React.ReactNode; checked: boolean; onChange: (value: boolean) => void}) => {
    return (
        <label className="panel-inset flex min-h-16 cursor-pointer items-center justify-between gap-4 px-4 py-3 transition-colors hover:brightness-115">
            <span className="flex min-w-0 items-center gap-3">
                {props.icon ? (
                    <span className="border-felt-950 bg-felt-700 text-gold-400 flex size-10 flex-none items-center justify-center rounded-xl border-3 text-lg" aria-hidden="true">
                        {props.icon}
                    </span>
                ) : null}
                <span className="min-w-0">
                    <span className="block font-black text-white">{props.label}</span>
                    {props.description ? <span className="mt-0.5 block text-xs font-semibold text-white/50">{props.description}</span> : null}
                </span>
            </span>
            <input type="checkbox" checked={props.checked} onChange={event => props.onChange(event.target.checked)} className="peer sr-only" />
            <span className="border-felt-950 bg-felt-700 peer-checked:bg-gold-500 relative h-9 w-15 flex-none rounded-full border-3 transition-colors after:absolute after:top-0.5 after:left-0.5 after:size-6 after:rounded-full after:bg-white after:transition-transform after:duration-150 peer-checked:after:translate-x-6" />
        </label>
    );
});
