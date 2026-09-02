import React from "react";

export const Panel = React.memo((props: {children: React.ReactNode; className?: string; padded?: boolean}) => {
    const padded = props.padded === false ? "" : "p-5 sm:p-6";
    return <div className={`panel ${padded} ${props.className ?? ""}`}>{props.children}</div>;
});

export const SectionTitle = React.memo((props: {children: React.ReactNode; icon?: React.ReactNode; className?: string}) => {
    return (
        <h2 className={`text-gold-400 flex items-center gap-2 text-xs font-black tracking-[0.2em] uppercase ${props.className ?? ""}`}>
            {props.icon ? (
                <span className="text-base" aria-hidden="true">
                    {props.icon}
                </span>
            ) : null}
            {props.children}
        </h2>
    );
});
