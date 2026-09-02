import React from "react";
import {FaCheck, FaCrown, FaPlay, FaRobot} from "react-icons/fa6";
import {LuCopy, LuShare2, LuTrash2, LuUserPlus} from "react-icons/lu";
import {AppShell} from "../../components/app-shell.tsx";
import {Button} from "../../components/ui/button.tsx";
import {Panel, SectionTitle} from "../../components/ui/panel.tsx";
import {addBot, leaveSession, removeBot, startGame, toggleReady} from "../../session/controller.ts";
import type {ConnectionStatus} from "../../stores/connection.ts";
import {useConnectionStore} from "../../stores/connection.ts";
import {useLobbyStore} from "../../stores/lobby.ts";
import {useSessionStore} from "../../stores/session.ts";

const STATUS_LABEL: Record<ConnectionStatus, string> = {
    idle: "未連線",
    connecting: "連線中",
    connected: "連線正常",
    reconnecting: "重連緊",
    offline: "已離線",
};

const ConnectionPill = React.memo((props: {status: ConnectionStatus}) => {
    const tone = props.status === "connected" ? "bg-felt-500 text-felt-950" : props.status === "reconnecting" ? "bg-gold-500 text-felt-950" : "bg-felt-700 text-white/70";
    return (
        <span className={`border-felt-950 inline-flex items-center gap-1.5 rounded-full border-3 px-3 py-1.5 text-xs font-black ${tone}`}>
            <span className="size-2 rounded-full bg-current" />
            {STATUS_LABEL[props.status]}
        </span>
    );
});

export const LobbyScreen = React.memo(() => {
    const room = useLobbyStore(state => state.room);
    const playerId = useSessionStore(state => state.playerId);
    const status = useConnectionStore(state => state.status);
    const lastError = useConnectionStore(state => state.lastError);
    const [copied, setCopied] = React.useState(false);

    if (!room) {
        return (
            <AppShell title="房間" onBack={leaveSession} width="md">
                <Panel className="text-center text-white/60">
                    <p className="animate-pulse">連線緊...</p>
                </Panel>
            </AppShell>
        );
    }

    const isHost = room.hostId === playerId;
    const self = room.seats.find(seat => seat?.playerId === playerId);
    const shareUrl = `${window.location.origin}/?room=${room.code}`;
    const filled = room.seats.filter(seat => seat).length;
    const canStart = room.seats.every(seat => seat) && room.seats.every(seat => !seat || seat.type === "bot" || seat.ready);

    const share = async () => {
        if (navigator.share) {
            await navigator.share({title: "鋤大D", text: `鋤大D 房間 ${room.code}`, url: shareUrl}).catch(() => undefined);
            return;
        }
        await navigator.clipboard.writeText(shareUrl).catch(() => undefined);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
    };

    const footer = (
        <div className="flex gap-3 pb-3">
            <Button size="lg" variant={self?.ready ? "ghost" : "secondary"} icon={<FaCheck />} block onClick={() => toggleReady(!self?.ready)}>
                {self?.ready ? "取消準備" : "準備"}
            </Button>
            {isHost ? (
                <Button size="lg" variant="primary" icon={<FaPlay />} block disabled={!canStart} onClick={() => startGame()}>
                    開始牌局
                </Button>
            ) : null}
        </div>
    );

    return (
        <AppShell title="房間" subtitle={`${filled} / 4 位就座`} onBack={leaveSession} width="md" footer={footer}>
            <div className="space-y-6">
                <Panel className="text-center">
                    <SectionTitle>房間碼</SectionTitle>
                    <p className="text-gold-500 mt-2 font-mono text-4xl font-black tracking-[0.4em] drop-shadow-[0_4px_0_var(--color-felt-950)] sm:text-5xl">{room.code}</p>
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                        <Button variant="secondary" icon={copied ? <LuCopy /> : <LuShare2 />} onClick={() => void share()}>
                            {copied ? "已複製連結" : "分享連結"}
                        </Button>
                        <ConnectionPill status={status} />
                    </div>
                    {lastError ? <p className="text-cherry-400 mt-3 text-sm font-bold">{lastError}</p> : null}
                </Panel>

                <div>
                    <SectionTitle className="mb-3">座位</SectionTitle>
                    <ul className="grid gap-3 sm:grid-cols-2">
                        {room.seats.map((seat, index) => (
                            <li key={index} className={`border-felt-950 flex min-h-18 items-center gap-3 rounded-2xl border-3 px-4 py-3 ${seat ? "bg-felt-800" : "bg-felt-900 border-dashed"}`}>
                                <span
                                    className={`border-felt-950 flex size-11 flex-none items-center justify-center rounded-2xl border-3 text-base font-black ${
                                        seat ? "bg-gold-500 text-felt-950" : "bg-felt-700 text-white/35"
                                    }`}
                                >
                                    {seat ? seat.type === "bot" ? <FaRobot aria-hidden="true" /> : seat.name.slice(0, 1) : index + 1}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-1.5 truncate font-bold text-white">
                                        {seat ? seat.name : "空位"}
                                        {seat && seat.playerId === room.hostId ? <FaCrown aria-label="房主" className="text-gold-400 flex-none text-sm" /> : null}
                                    </span>
                                    <span className="block text-xs font-semibold text-white/45">
                                        {seat ? (seat.type === "bot" ? "電腦補位" : seat.connected ? (seat.ready ? "已準備" : "未準備") : "斷線") : "等緊人入嚟"}
                                    </span>
                                </span>
                                {isHost && !seat ? <Button size="sm" variant="secondary" icon={<LuUserPlus />} ariaLabel="加電腦" onClick={() => addBot(index as 0 | 1 | 2 | 3)} /> : null}
                                {isHost && seat?.type === "bot" ? (
                                    <Button size="sm" variant="ghost" icon={<LuTrash2 />} ariaLabel="移除電腦" onClick={() => removeBot(index as 0 | 1 | 2 | 3)} />
                                ) : null}
                                {seat?.ready ? <FaCheck className="text-gold-400 flex-none text-lg" aria-label="已準備" /> : null}
                            </li>
                        ))}
                    </ul>
                </div>

                {!isHost ? <p className="text-center text-sm font-semibold text-white/45">等房主開局</p> : null}
            </div>
        </AppShell>
    );
});
