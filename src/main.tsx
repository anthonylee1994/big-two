import React from "react";
import {createRoot} from "react-dom/client";
import {registerSW} from "virtual:pwa-register";
import {App} from "./app.tsx";
import {getAppState} from "./stores/app.ts";
import "./index.css";

registerSW({
    onNeedRefresh() {
        getAppState().setUpdateReady(true);
    },
});

// 安裝咗做 PWA 嘅話鎖直向；普通 browser tab 會 reject，靠 OrientationGate 兜底
function lockPortrait(): void {
    const orientation = screen.orientation as ScreenOrientation & {lock?: (value: string) => Promise<void>};
    orientation.lock?.("portrait").catch(() => undefined);
}

lockPortrait();

createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
