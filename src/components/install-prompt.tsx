import React from "react";
import {LuDownload, LuX} from "react-icons/lu";
import {Button} from "./ui/button.tsx";

interface InstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{outcome: "accepted" | "dismissed"}>;
}

export const InstallPrompt = React.memo(() => {
    const [event, setEvent] = React.useState<InstallPromptEvent | null>(null);
    const [dismissed, setDismissed] = React.useState(false);

    React.useEffect(() => {
        const onPrompt = (native: Event) => {
            native.preventDefault();
            setEvent(native as InstallPromptEvent);
        };
        const onInstalled = () => setEvent(null);
        window.addEventListener("beforeinstallprompt", onPrompt);
        window.addEventListener("appinstalled", onInstalled);
        return () => {
            window.removeEventListener("beforeinstallprompt", onPrompt);
            window.removeEventListener("appinstalled", onInstalled);
        };
    }, []);

    if (!event || dismissed) {
        return null;
    }

    const install = async () => {
        await event.prompt();
        await event.userChoice;
        setEvent(null);
    };

    return (
        <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4">
            <div className="panel animate-rise pointer-events-auto mb-3 flex items-center gap-3 px-4 py-3 text-sm">
                <span className="font-semibold text-white/85">裝落主畫面，全螢幕玩得順啲。</span>
                <Button size="sm" variant="primary" icon={<LuDownload />} onClick={() => void install()}>
                    安裝
                </Button>
                <Button size="sm" variant="ghost" icon={<LuX />} ariaLabel="唔安裝" onClick={() => setDismissed(true)} />
            </div>
        </div>
    );
});
