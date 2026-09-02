import React from "react";
import {LuSmartphone} from "react-icons/lu";

export const OrientationGate = React.memo(() => {
    return (
        <div className="orientation-gate" role="alertdialog" aria-label="請轉直向">
            <div className="panel mx-4 flex max-w-sm flex-col items-center gap-4 px-6 py-8 text-center">
                <span className="border-felt-950 bg-gold-500 text-felt-950 animate-bob flex size-16 rotate-90 items-center justify-center rounded-3xl border-3 text-3xl shadow-[0_5px_0_var(--color-felt-950)]">
                    <LuSmartphone aria-hidden="true" />
                </span>
                <p className="text-gold-500 text-2xl font-black">打橫玩唔到</p>
                <p className="font-semibold text-white/70">鋤大 D 要直向先夠位擺牌同出牌。請轉返直向，或者將視窗拉高。</p>
            </div>
        </div>
    );
});
