import React from "react";
import {FaForward, FaPlay} from "react-icons/fa6";
import {LuArrowUpDown, LuKeyboard, LuLogOut, LuScrollText, LuSparkles, LuX} from "react-icons/lu";
import {HandFan} from "../../components/game/hand-fan.tsx";
import {SeatPanel} from "../../components/game/seat-panel.tsx";
import {TableCenter} from "../../components/game/table-center.tsx";
import {Button} from "../../components/ui/button.tsx";
import {compareCard} from "../../game/domain/cards.ts";
import {identifyCombination} from "../../game/domain/combination.ts";
import {KIND_NAMES} from "../../game/domain/labels.ts";
import type {Card, Seat} from "../../game/domain/types.ts";
import {isLegalPlay, listLegalPlays} from "../../game/engine/legal.ts";
import {leaveSession, passTurn, playSelected} from "../../session/controller.ts";
import {useConnectionStore} from "../../stores/connection.ts";
import {useGameStore} from "../../stores/game.ts";
import {usePreferencesStore} from "../../stores/preferences.ts";

function sortHand(cards: Card[], sort: "rank" | "suit"): Card[] {
    return [...cards].sort((a, b) => (sort === "suit" ? a.suit.localeCompare(b.suit) || compareCard(a, b) : compareCard(a, b)));
}

function isTypingTarget(target: EventTarget | null): boolean {
    const element = target as HTMLElement | null;
    return Boolean(element && (element.tagName === "INPUT" || element.tagName === "TEXTAREA" || element.isContentEditable));
}

export const GameScreen = React.memo(() => {
    const snapshot = useGameStore(state => state.snapshot);
    const selectedIds = useGameStore(state => state.selectedIds);
    const toggleCard = useGameStore(state => state.toggleCard);
    const setSelection = useGameStore(state => state.setSelection);
    const clearSelection = useGameStore(state => state.clearSelection);
    const pending = useGameStore(state => state.pendingCommandId);
    const lastError = useGameStore(state => state.lastError);
    const handSort = usePreferencesStore(state => state.handSort);
    const setHandSort = usePreferencesStore(state => state.setHandSort);
    const status = useConnectionStore(state => state.status);
    const [quickOpen, setQuickOpen] = React.useState(false);

    React.useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (isTypingTarget(event.target)) {
                return;
            }
            if (event.key === "Enter") {
                playSelected();
            }
            if (event.key === "p" || event.key === "P") {
                passTurn();
            }
            if (event.key === "Escape") {
                clearSelection();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [clearSelection]);

    if (!snapshot) {
        return (
            <div className="flex min-h-dvh items-center justify-center text-white/60">
                <p className="animate-pulse">載入牌局...</p>
            </div>
        );
    }

    const players = snapshot.players;
    const bySeat = (seat: Seat) => players.find(player => player.seat === seat)!;
    const relative = (offset: number) => ((snapshot.ownSeat + offset) % 4) as Seat;

    const lastPassSeats = new Set<Seat>();
    for (let index = snapshot.playLog.length - 1; index >= 0; index -= 1) {
        const entry = snapshot.playLog[index];
        if (entry.play !== "pass") {
            break;
        }
        lastPassSeats.add(entry.seat);
    }

    const me = bySeat(snapshot.ownSeat);
    const hand = sortHand(snapshot.ownHand, handSort);
    const selectedCards = snapshot.ownHand.filter(card => selectedIds.includes(card.id));
    const combination = selectedCards.length ? identifyCombination(selectedCards) : null;
    const myTurn = snapshot.currentPlayerSeat === snapshot.ownSeat && snapshot.phase === "playing";
    const playContext = {
        lastPlay: snapshot.lastPlay,
        mustIncludeDiamond3: snapshot.mustIncludeDiamond3,
    };
    const legal = Boolean(combination && isLegalPlay(combination, playContext));
    const hasAnyLegal = listLegalPlays(snapshot.ownHand, playContext).length > 0;
    const legalPlays = myTurn ? listLegalPlays(snapshot.ownHand, playContext) : [];
    const canPass = myTurn && (snapshot.lastPlay !== null || !hasAnyLegal);

    const quickPlays = (() => {
        const order = ["single", "pair", "triple", "straight", "flush", "fullHouse", "fourOfAKind", "straightFlush"] as const;
        return order.map(kind => ({kind, plays: legalPlays.filter(play => play.kind === kind)})).filter(group => group.plays.length > 0);
    })();

    const chooseQuickPlay = (kind: (typeof quickPlays)[number]["kind"]) => {
        const plays = quickPlays.find(group => group.kind === kind)?.plays ?? [];
        if (plays.length === 0) {
            return;
        }
        const currentKey = selectedIds.join(",");
        const currentIndex = plays.findIndex(play => play.cards.map(card => card.id).join(",") === currentKey);
        const next = plays[(currentIndex + 1) % plays.length];
        setSelection(next.cards.map(card => card.id));
        setQuickOpen(false);
    };

    const turnLabel = myTurn ? "輪到你出牌" : `輪到 ${bySeat(snapshot.currentPlayerSeat).name}`;
    const hintLabel = snapshot.mustIncludeDiamond3 ? "開局，必須含 ♦3" : "自由出牌，任意牌型";

    const selectionLabel = () => {
        if (selectedCards.length === 0) {
            return myTurn && !hasAnyLegal ? "冇牌夠大，Pass 啦" : "㩒手牌揀出想打嘅牌";
        }
        if (!combination) {
            return `已揀 ${selectedCards.length} 張 · 唔係有效牌型`;
        }
        return `${KIND_NAMES[combination.kind]} · ${legal ? "可以出" : "壓唔到上一手"}`;
    };

    return (
        <div className="flex h-dvh w-full overflow-x-hidden overflow-y-auto md:overflow-hidden">
            <div className="safe-x mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col">
                <header className="safe-top flex flex-none items-center gap-2 pb-2">
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-white">{me.name}</p>
                        <p className="text-[0.7rem] font-semibold text-white/50 tabular-nums">
                            手牌 {snapshot.ownHand.length} 張 · 累積 {me.score} 分
                        </p>
                    </div>
                    {myTurn && quickPlays.length > 0 ? <Button size="sm" variant="ghost" icon={<LuSparkles />} ariaLabel="快捷揀牌" onClick={() => setQuickOpen(true)} /> : null}
                    <Button size="sm" variant="ghost" icon={<LuArrowUpDown />} onClick={() => setHandSort(handSort === "rank" ? "suit" : "rank")} title="切換手牌排序">
                        {handSort === "rank" ? "點數" : "花色"}
                    </Button>
                    <Button size="sm" variant="ghost" icon={<LuLogOut />} ariaLabel="退出牌局" onClick={() => leaveSession()} />
                </header>

                {status === "reconnecting" ? (
                    <p className="border-felt-950 bg-gold-500 text-felt-950 mb-2 flex-none rounded-2xl border-3 px-3 py-2 text-center text-sm font-black">斷線重連緊，出牌尚未確認。</p>
                ) : null}

                <div className="table-area min-h-0 flex-1 md:min-h-0">
                    <div className="seat-row">
                        <SeatPanel slot="left" player={bySeat(relative(3))} active={snapshot.currentPlayerSeat === relative(3)} passed={lastPassSeats.has(relative(3))} />
                        <SeatPanel slot="top" player={bySeat(relative(2))} active={snapshot.currentPlayerSeat === relative(2)} passed={lastPassSeats.has(relative(2))} />
                        <SeatPanel slot="right" player={bySeat(relative(1))} active={snapshot.currentPlayerSeat === relative(1)} passed={lastPassSeats.has(relative(1))} />
                    </div>
                    <TableCenter round={snapshot.round} turnLabel={turnLabel} myTurn={myTurn} lastPlay={snapshot.lastPlay} hintLabel={hintLabel} />
                </div>

                <div className="flex-none pt-1">
                    <HandFan cards={hand} selectedIds={selectedIds} onToggle={toggleCard} />
                </div>

                <div className="safe-bottom flex-none pt-2">
                    <p className={`mb-2 min-h-5 text-center text-xs font-bold ${lastError ? "text-cherry-400" : legal ? "text-gold-400" : "text-white/55"}`}>{lastError ?? selectionLabel()}</p>
                    <div className="mx-auto flex max-w-md items-center gap-3">
                        <Button className="action-btn" size="lg" variant="ghost" icon={<FaForward />} block disabled={!myTurn || pending !== null || !canPass} onClick={() => passTurn()}>
                            Pass
                        </Button>
                        {selectedIds.length > 0 ? <Button className="action-btn" size="lg" variant="ghost" icon={<LuX />} ariaLabel="清除選擇" onClick={() => clearSelection()} /> : null}
                        <Button className="action-btn" size="lg" variant="primary" icon={<FaPlay />} block disabled={!myTurn || pending !== null || !legal} onClick={() => playSelected()}>
                            出牌
                        </Button>
                    </div>
                </div>
            </div>

            {quickOpen && myTurn ? (
                <div className="quick-play-drawer fixed inset-0 z-100 flex items-start justify-center" role="dialog" aria-modal="true" aria-label="快捷揀牌">
                    <button className="quick-play-backdrop absolute inset-0" aria-label="關閉快捷揀牌" onClick={() => setQuickOpen(false)} />
                    <div className="quick-play-dialog panel relative w-full max-w-xl rounded-t-none p-4 pt-[max(1rem,env(safe-area-inset-top))]">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="flex items-center gap-2 text-base font-black text-white">
                                <LuSparkles />
                                快捷揀牌
                            </h2>
                            <Button size="sm" variant="ghost" icon={<LuX />} ariaLabel="關閉" onClick={() => setQuickOpen(false)} />
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {quickPlays.map(group => (
                                <Button key={group.kind} size="sm" variant={combination?.kind === group.kind ? "secondary" : "ghost"} onClick={() => chooseQuickPlay(group.kind)}>
                                    {KIND_NAMES[group.kind]}
                                    {group.plays.length > 1 ? <span className="quick-play-count">{group.plays.length}</span> : null}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>
            ) : null}

            <aside className="bar hidden w-72 flex-none flex-col gap-5 border-l-4 p-5 text-sm lg:flex">
                <div className="min-h-0 flex-1 overflow-y-auto">
                    <h2 className="text-gold-400 mb-3 flex items-center gap-2 text-xs font-black tracking-[0.2em] uppercase">
                        <LuScrollText aria-hidden="true" className="text-base" />
                        出牌紀錄
                    </h2>
                    <ol className="space-y-1.5 text-white/70">
                        {snapshot.playLog
                            .slice(-18)
                            .reverse()
                            .map((entry, index) => (
                                <li key={`${entry.seat}-${index}`} className="border-felt-950 bg-felt-800 flex items-center justify-between gap-2 rounded-xl border-2 px-2.5 py-1.5">
                                    <span className="truncate font-semibold">{bySeat(entry.seat).name}</span>
                                    <span className={`font-black ${entry.play === "pass" ? "text-white/40" : "text-gold-400"}`}>{entry.play === "pass" ? "Pass" : KIND_NAMES[entry.play.kind]}</span>
                                </li>
                            ))}
                    </ol>
                </div>
                <div>
                    <h2 className="text-gold-400 mb-2 flex items-center gap-2 text-xs font-black tracking-[0.2em] uppercase">
                        <LuKeyboard aria-hidden="true" className="text-base" />
                        快捷鍵
                    </h2>
                    <ul className="space-y-1 text-xs font-semibold text-white/50">
                        <li>Enter — 出牌</li>
                        <li>P — Pass</li>
                        <li>Esc — 清除選擇</li>
                    </ul>
                </div>
            </aside>
        </div>
    );
});
