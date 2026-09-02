import React from "react";
import {FaRobot} from "react-icons/fa6";
import {LuBookOpen, LuDoorOpen, LuLogIn, LuSettings} from "react-icons/lu";
import {AppShell} from "../../components/app-shell.tsx";
import {PlayingCard} from "../../components/playing-card.tsx";
import {Button} from "../../components/ui/button.tsx";
import {Panel} from "../../components/ui/panel.tsx";
import {TextField} from "../../components/ui/text-field.tsx";
import type {Card} from "../../game/domain/types.ts";
import {createOnlineRoom, joinOnlineRoom, startOfflineMatch} from "../../session/controller.ts";
import {useAppStore} from "../../stores/app.ts";
import {useSessionStore} from "../../stores/session.ts";

const DECO_CARDS: Card[] = [
    {id: "D3", suit: "diamond", rank: "3"},
    {id: "C5", suit: "club", rank: "5"},
    {id: "H10", suit: "heart", rank: "10"},
    {id: "SA", suit: "spade", rank: "A"},
    {id: "S2", suit: "spade", rank: "2"},
];

export const HomeScreen = React.memo(() => {
    const displayName = useSessionStore(state => state.displayName);
    const setName = useSessionStore(state => state.setName);
    const joinCode = useAppStore(state => state.joinCode);
    const setJoinCode = useAppStore(state => state.setJoinCode);
    const setScreen = useAppStore(state => state.setScreen);

    const actions = (
        <React.Fragment>
            <Button size="sm" variant="ghost" icon={<LuBookOpen />} onClick={() => setScreen("rules")}>
                規則
            </Button>
            <Button size="sm" variant="ghost" icon={<LuSettings />} ariaLabel="設定" onClick={() => setScreen("settings")} />
        </React.Fragment>
    );

    return (
        <AppShell width="lg" actions={actions}>
            <div className="grid items-center gap-8 lg:min-h-[calc(100dvh-13rem)] lg:grid-cols-[1.05fr_1fr] lg:gap-12">
                <section className="text-center lg:text-left">
                    <p className="text-gold-500 text-xs font-black tracking-[0.45em] uppercase">Big Two</p>
                    <h2 className="text-gold-500 mt-2 text-6xl font-black tracking-tight drop-shadow-[0_6px_0_var(--color-felt-950)] sm:text-7xl">鋤大D</h2>
                    <p className="mx-auto mt-4 max-w-sm font-semibold text-white/70 lg:mx-0">4 人香港玩法。單機同電腦練習，或者開私人房邀請朋友網上對戰，人數唔夠可以加電腦補位。</p>
                    <div className="card-stack pointer-events-none mt-8 justify-center lg:justify-start" style={{"--card-w": "clamp(3.25rem, 5vw, 4.75rem)"} as React.CSSProperties} aria-hidden="true">
                        {DECO_CARDS.map((card, index) => (
                            <div key={card.id} style={{transform: `rotate(${(index - 2) * 8}deg) translateY(${Math.abs(index - 2) * 7}px)`, zIndex: index}}>
                                <PlayingCard card={card} size="fan" />
                            </div>
                        ))}
                    </div>
                </section>

                <Panel className="space-y-5">
                    <TextField label="你嘅名稱" value={displayName} onChange={setName} maxLength={12} placeholder="訪客" />

                    <Button size="lg" variant="primary" icon={<FaRobot />} block onClick={() => startOfflineMatch()}>
                        同電腦開局
                    </Button>

                    <div className="flex items-center gap-3 text-[0.7rem] font-black tracking-[0.2em] text-white/35 uppercase">
                        <span className="bg-felt-950 h-1 flex-1 rounded-full" />
                        網上對戰
                        <span className="bg-felt-950 h-1 flex-1 rounded-full" />
                    </div>

                    <Button size="lg" variant="secondary" icon={<LuDoorOpen />} block onClick={() => createOnlineRoom()}>
                        建立房間
                    </Button>

                    <div className="space-y-3">
                        <TextField label="房間碼" value={joinCode} onChange={setJoinCode} maxLength={6} placeholder="ABCDEF" mono transform="upper" />
                        <Button size="lg" variant="ghost" icon={<LuLogIn />} block disabled={joinCode.trim().length === 0} onClick={() => joinOnlineRoom(joinCode)}>
                            加入房間
                        </Button>
                    </div>
                </Panel>
            </div>
        </AppShell>
    );
});
