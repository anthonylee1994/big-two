import React from "react";
import {LuRefreshCw} from "react-icons/lu";
import {InstallPrompt} from "./components/install-prompt.tsx";
import {OrientationGate} from "./components/orientation-gate.tsx";
import {Button} from "./components/ui/button.tsx";
import {GameScreen} from "./features/game/game-screen.tsx";
import {HomeScreen} from "./features/home/home-screen.tsx";
import {LobbyScreen} from "./features/lobby/lobby-screen.tsx";
import {ResultsScreen} from "./features/results/results-screen.tsx";
import {RulesScreen} from "./features/rules/rules-screen.tsx";
import {SettingsScreen} from "./features/settings/settings-screen.tsx";
import {createOnlineRoom, joinOnlineRoom, startOfflineMatch} from "./session/controller.ts";
import {useAppStore} from "./stores/app.ts";
import {usePreferencesStore} from "./stores/preferences.ts";

let bootstrapped = false;

export const App = React.memo(() => {
    const screen = useAppStore(state => state.screen);
    const updateReady = useAppStore(state => state.updateReady);
    const setUpdateReady = useAppStore(state => state.setUpdateReady);
    const setJoinCode = useAppStore(state => state.setJoinCode);
    const animation = usePreferencesStore(state => state.animation);

    React.useEffect(() => {
        if (bootstrapped) {
            return;
        }
        bootstrapped = true;
        const params = new URLSearchParams(window.location.search);
        const room = params.get("room");
        if (room) {
            setJoinCode(room.toUpperCase());
            joinOnlineRoom(room);
            return;
        }
        if (params.get("start") === "solo") {
            startOfflineMatch();
            return;
        }
        if (params.get("action") === "create") {
            createOnlineRoom();
        }
    }, [setJoinCode]);

    return (
        <div className={animation ? "" : "motion-reduce"}>
            {screen === "home" ? <HomeScreen /> : null}
            {screen === "lobby" ? <LobbyScreen /> : null}
            {screen === "game" ? <GameScreen /> : null}
            {screen === "results" ? <ResultsScreen /> : null}
            {screen === "rules" ? <RulesScreen /> : null}
            {screen === "settings" ? <SettingsScreen /> : null}

            {screen === "home" ? <InstallPrompt /> : null}

            <OrientationGate />

            {updateReady ? (
                <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4">
                    <div className="panel animate-rise pointer-events-auto mb-3 flex items-center gap-3 px-4 py-3 text-sm">
                        <span className="font-semibold text-white/85">有新版本</span>
                        <Button size="sm" variant="primary" icon={<LuRefreshCw />} onClick={() => window.location.reload()}>
                            更新
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setUpdateReady(false)}>
                            之後
                        </Button>
                    </div>
                </div>
            ) : null}
        </div>
    );
});
