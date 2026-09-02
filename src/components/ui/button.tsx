import React from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    ghost: "btn-ghost",
    danger: "btn-danger",
};

const SIZE_CLASS: Record<ButtonSize, string> = {
    sm: "min-h-10 px-3 text-sm rounded-xl gap-1.5",
    md: "min-h-12 px-4 text-base rounded-2xl gap-2",
    lg: "min-h-14 px-5 text-lg rounded-2xl gap-2.5",
};

const ICON_SIZE: Record<ButtonSize, string> = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-xl",
};

export const Button = React.memo(
    (props: {
        children?: React.ReactNode;
        icon?: React.ReactNode;
        onClick?: () => void;
        type?: "button" | "submit";
        variant?: ButtonVariant;
        size?: ButtonSize;
        disabled?: boolean;
        block?: boolean;
        title?: string;
        ariaLabel?: string;
        className?: string;
    }) => {
        const size = props.size ?? "md";

        return (
            <button
                type={props.type ?? "button"}
                onClick={props.onClick}
                disabled={props.disabled}
                title={props.title}
                aria-label={props.ariaLabel}
                className={`btn ${VARIANT_CLASS[props.variant ?? "ghost"]} ${SIZE_CLASS[size]} ${props.block ? "w-full" : ""} inline-flex items-center justify-center leading-none select-none disabled:pointer-events-none disabled:opacity-45 disabled:grayscale-75 ${props.className ?? ""}`}
            >
                {props.icon ? (
                    <span className={`${ICON_SIZE[size]} flex-none`} aria-hidden="true">
                        {props.icon}
                    </span>
                ) : null}
                {props.children}
            </button>
        );
    }
);
