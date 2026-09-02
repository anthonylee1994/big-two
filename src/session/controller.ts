import {createId} from "../lib/id.ts";
import type {ClientCommand, ServerEvent} from "../protocol/messages.ts";
import {getAppState} from "../stores/app.ts";
import {getConnectionState} from "../stores/connection.ts";
import {getGameState} from "../stores/game.ts";
import {getLobbyState} from "../stores/lobby.ts";
import {getPreferencesState} from "../stores/preferences.ts";
import {getSessionState} from "../stores/session.ts";
import {LocalTransport} from "../transport/local.ts";
import type {Transport} from "../transport/types.ts";
import {WebSocketTransport} from "../transport/websocket.ts";

let transport: Transport | null = null;
let unsubscribe: (() => void) | null = null;

function beep(): void {
    if (!getPreferencesState().sound || typeof window === "undefined") {
        return;
    }
    const AudioContextCtor = window.AudioContext || (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext;
    const ctx = new AudioContextCtor();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.frequency.value = 520;
    gain.gain.value = 0.04;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.08);
}

function vibrate(): void {
    if (getPreferencesState().haptics && navigator.vibrate) {
        navigator.vibrate(12);
    }
}

function handleEvent(event: ServerEvent): void {
    if (event.type === "room.snapshot") {
        getLobbyState().setRoom(event.room);
        if (event.room.status === "playing") {
            getAppState().setScreen("game");
        }
        if (event.room.status === "roundResult") {
            getAppState().setScreen("results");
        }
        if (event.room.status === "lobby") {
            const screen = getAppState().screen;
            if (screen === "home") {
                getAppState().setScreen("lobby");
            }
        }
        return;
    }
    if (event.type === "game.snapshot") {
        getGameState().setSnapshot(event.game);
        if (event.game.phase === "playing") {
            getAppState().setScreen("game");
        }
        if (event.game.phase === "roundEnded") {
            getAppState().setScreen("results");
        }
        return;
    }
    if (event.type === "game.roundEnded") {
        getGameState().setSnapshot(event.game);
        getGameState().clearSelection();
        getAppState().setScreen("results");
        return;
    }
    if (event.type === "game.actionAccepted") {
        getGameState().setPending(null);
        getGameState().setError(null);
        getGameState().clearSelection();
        beep();
        vibrate();
        return;
    }
    if (event.type === "game.actionRejected") {
        getGameState().setPending(null);
        getGameState().setError(event.reason);
        if (event.room) {
            getLobbyState().setRoom(event.room);
        }
        if (event.game) {
            getGameState().setSnapshot(event.game);
        }
        return;
    }
    if (event.type === "error") {
        getGameState().setError(event.message);
        getConnectionState().setError(event.message);
        return;
    }
    if (event.type === "pong") {
        getConnectionState().setLatency(Date.now() - event.sentAt);
        return;
    }
    if (event.type === "player.connectionChanged") {
        return;
    }
}

function attach(next: Transport): void {
    unsubscribe?.();
    transport?.disconnect();
    transport = next;
    unsubscribe = next.subscribe(handleEvent);
}

export function getTransport(): Transport | null {
    return transport;
}

export function sendCommand(command: ClientCommand): void {
    getGameState().setPending(command.commandId);
    transport?.send(command);
}

export function startOfflineMatch(): void {
    const session = getSessionState();
    const local = new LocalTransport({
        playerId: session.playerId,
        name: session.displayName,
        reconnectToken: session.reconnectToken,
        aiDelayMs: 420,
    });
    attach(local);
    getConnectionState().setStatus("connected");
    local.startOfflineMatch();
}

export function startOnlineSession(): WebSocketTransport {
    const session = getSessionState();
    const ws = new WebSocketTransport({
        onStatus: status => getConnectionState().setStatus(status),
        resume: () => {
            const room = getLobbyState().room;
            if (!room) {
                return null;
            }
            return {
                type: "session.resume",
                commandId: createId(),
                playerId: session.playerId,
                reconnectToken: session.reconnectToken,
                roomCode: room.code,
            };
        },
    });
    attach(ws);
    return ws;
}

export function createOnlineRoom(): void {
    const session = getSessionState();
    startOnlineSession();
    sendCommand({
        type: "room.create",
        commandId: createId(),
        playerId: session.playerId,
        name: session.displayName,
        reconnectToken: session.reconnectToken,
    });
    getAppState().setScreen("lobby");
}

export function joinOnlineRoom(roomCode: string): void {
    const session = getSessionState();
    startOnlineSession();
    sendCommand({
        type: "room.join",
        commandId: createId(),
        playerId: session.playerId,
        name: session.displayName,
        reconnectToken: session.reconnectToken,
        roomCode: roomCode.trim().toUpperCase(),
    });
    getAppState().setScreen("lobby");
}

export function leaveSession(): void {
    unsubscribe?.();
    transport?.disconnect();
    transport = null;
    unsubscribe = null;
    getLobbyState().setRoom(null);
    getGameState().setSnapshot(null);
    getGameState().clearSelection();
    getGameState().setPending(null);
    getGameState().setError(null);
    getConnectionState().setStatus("idle");
    getAppState().setScreen("home");
}

export function playSelected(): void {
    const room = getLobbyState().room;
    const selected = getGameState().selectedIds;
    if (!room || selected.length === 0) {
        return;
    }
    sendCommand({type: "game.playCards", commandId: createId(), revision: room.revision, cardIds: selected});
}

export function passTurn(): void {
    const room = getLobbyState().room;
    if (!room) {
        return;
    }
    sendCommand({type: "game.pass", commandId: createId(), revision: room.revision});
}

export function toggleReady(ready: boolean): void {
    const room = getLobbyState().room;
    if (!room) {
        return;
    }
    sendCommand({type: "room.ready", commandId: createId(), revision: room.revision, ready});
}

export function addBot(seat?: 0 | 1 | 2 | 3): void {
    const room = getLobbyState().room;
    if (!room) {
        return;
    }
    sendCommand({type: "room.addBot", commandId: createId(), revision: room.revision, seat});
}

export function removeBot(seat: 0 | 1 | 2 | 3): void {
    const room = getLobbyState().room;
    if (!room) {
        return;
    }
    sendCommand({type: "room.removeBot", commandId: createId(), revision: room.revision, seat});
}

export function startGame(): void {
    const room = getLobbyState().room;
    if (!room) {
        return;
    }
    sendCommand({type: "game.start", commandId: createId(), revision: room.revision});
}

export function startNextRound(): void {
    const room = getLobbyState().room;
    if (!room) {
        return;
    }
    sendCommand({type: "game.startRound", commandId: createId(), revision: room.revision});
}
