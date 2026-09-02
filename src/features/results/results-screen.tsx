import React from "react";
import {FaDragon, FaHouse, FaRobot, FaTrophy} from "react-icons/fa6";
import {LuRepeat} from "react-icons/lu";
import {AppShell} from "../../components/app-shell.tsx";
import {PlayingCard} from "../../components/playing-card.tsx";
import {Button} from "../../components/ui/button.tsx";
import {Panel} from "../../components/ui/panel.tsx";
import {leaveSession, startNextRound} from "../../session/controller.ts";
import {useGameStore} from "../../stores/game.ts";
import {useLobbyStore} from "../../stores/lobby.ts";
import {useSessionStore} from "../../stores/session.ts";

export const ResultsScreen = React.memo(() => {
    const snapshot = useGameStore(state => state.snapshot);
    const room = useLobbyStore(state => state.room);
    const playerId = useSessionStore(state => state.playerId);

    if (!snapshot) {
        return <AppShell title="結果" onBack={leaveSession} width="md" />;
    }

    const winner = snapshot.players.find(player => player.seat === snapshot.winnerSeat);
    const isHost = room ? room.hostId === playerId : true;
    const ranked = [...snapshot.players].sort((a, b) => snapshot.penalties[a.seat] - snapshot.penalties[b.seat]);

    const footer = (
        <div className="flex gap-3 pb-3">
            <Button size="lg" variant="ghost" icon={<FaHouse />} block onClick={() => leaveSession()}>
                返回首頁
            </Button>
            {isHost ? (
                <Button size="lg" variant="primary" icon={<LuRepeat />} block onClick={() => startNextRound()}>
                    下一局
                </Button>
            ) : (
                <p className="flex flex-1 items-center justify-center text-sm font-semibold text-white/45">等房主開下一局</p>
            )}
        </div>
    );

    return (
        <AppShell title={`第 ${snapshot.round} 局結果`} onBack={leaveSession} width="lg" footer={footer}>
            <div className="space-y-6">
                <Panel className="text-center">
                    <span className="border-felt-950 bg-gold-500 text-felt-950 animate-bob mx-auto mb-3 flex size-18 items-center justify-center rounded-3xl border-3 text-3xl shadow-[0_5px_0_var(--color-felt-950)]">
                        {snapshot.dragonWin ? <FaDragon aria-hidden="true" /> : <FaTrophy aria-hidden="true" />}
                    </span>
                    {snapshot.dragonWin ? <p className="text-gold-500 text-xs font-black tracking-[0.35em] uppercase">一條龍</p> : null}
                    <p className="text-gold-500 mt-1 text-3xl font-black drop-shadow-[0_4px_0_var(--color-felt-950)] sm:text-4xl">{winner?.name ?? "玩家"} 勝出</p>
                    <p className="mt-2 text-sm font-semibold text-white/55">最先出清手牌</p>
                </Panel>

                <ul className="grid gap-3 lg:grid-cols-2">
                    {ranked.map(player => {
                        const isWinner = player.seat === snapshot.winnerSeat;
                        const remaining = snapshot.remainingHands?.[player.seat] ?? [];
                        return (
                            <li key={player.id} className={`border-felt-950 rounded-2xl border-3 px-4 py-4 ${isWinner ? "bg-felt-700" : "bg-felt-800"}`}>
                                <div className="flex items-center gap-3">
                                    <span
                                        className={`border-felt-950 flex size-11 flex-none items-center justify-center rounded-2xl border-3 text-base font-black ${
                                            isWinner ? "bg-gold-500 text-felt-950" : "bg-felt-600 text-white/80"
                                        }`}
                                    >
                                        {player.type === "bot" ? <FaRobot aria-hidden="true" /> : player.name.slice(0, 1)}
                                    </span>
                                    <span className="min-w-0 flex-1 truncate font-bold text-white">{player.name}</span>
                                    <span className="text-right text-sm tabular-nums">
                                        <span className={`text-lg font-black ${isWinner ? "text-gold-400" : "text-cherry-400"}`}>+{snapshot.penalties[player.seat]}</span>
                                        <span className="block text-xs font-semibold text-white/50">累積 {player.score}</span>
                                    </span>
                                </div>
                                {remaining.length ? (
                                    <div className="card-stack card-xs mt-3 justify-start overflow-hidden">
                                        {remaining.map(card => (
                                            <PlayingCard key={card.id} card={card} size="fan" />
                                        ))}
                                    </div>
                                ) : (
                                    <p className="mt-3 text-xs text-white/35">手牌出清</p>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </div>
        </AppShell>
    );
});
