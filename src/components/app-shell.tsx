import React from "react";
import {LuArrowLeft} from "react-icons/lu";

const WIDTH_CLASS: Record<string, string> = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
};

export const BrandMark = React.memo((props: {size?: "sm" | "md"}) => {
    const size = props.size === "sm" ? "size-8 text-base" : "size-11 text-xl";
    return (
        <span
            className={`${size} border-gold-800 bg-gold-500 text-felt-950 inline-flex flex-none -rotate-6 items-center justify-center rounded-2xl border-3 font-black shadow-[0_4px_0_var(--color-gold-800)]`}
            aria-hidden="true"
        >
            大
        </span>
    );
});

export const AppShell = React.memo(
    (props: {title?: string; subtitle?: string; onBack?: () => void; actions?: React.ReactNode; footer?: React.ReactNode; width?: "sm" | "md" | "lg" | "xl"; children?: React.ReactNode}) => {
        const width = WIDTH_CLASS[props.width ?? "lg"];

        return (
            <div className="flex min-h-dvh flex-col">
                <header className="bar safe-top border-b-4">
                    <div className={`mx-auto flex w-full ${width} safe-x items-center gap-3 pb-3`}>
                        {props.onBack ? (
                            <button type="button" onClick={props.onBack} aria-label="返回" className="btn btn-ghost inline-flex size-11 flex-none items-center justify-center rounded-2xl text-lg">
                                <LuArrowLeft aria-hidden="true" />
                            </button>
                        ) : (
                            <BrandMark />
                        )}
                        <div className="min-w-0 flex-1">
                            <h1 className="text-gold-300 truncate text-lg font-black sm:text-2xl">{props.title ?? "鋤大D"}</h1>
                            {props.subtitle ? <p className="truncate text-xs font-semibold text-white/45">{props.subtitle}</p> : null}
                        </div>
                        {props.actions ? <div className="flex flex-none items-center gap-2">{props.actions}</div> : null}
                    </div>
                </header>

                <main className={`mx-auto w-full flex-1 ${width} safe-x py-5 sm:py-8`}>{props.children}</main>

                {props.footer ? (
                    <div className="bar safe-bottom sticky bottom-0 border-t-4 pt-3">
                        <div className={`mx-auto w-full ${width} safe-x`}>{props.footer}</div>
                    </div>
                ) : null}
            </div>
        );
    }
);
