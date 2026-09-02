import type {PublicGameState, Seat} from "../game/domain/types.ts";

export type RoomStatus = "lobby" | "playing" | "roundResult";

export interface RoomSeatView {
    playerId: string;
    name: string;
    type: "human" | "bot";
    ready: boolean;
    connected: boolean;
}

export interface RoomSnapshot {
    code: string;
    hostId: string;
    seats: (RoomSeatView | null)[];
    status: RoomStatus;
    revision: number;
}

export type ClientCommand =
    | {type: "room.create"; commandId: string; playerId: string; name: string; reconnectToken: string}
    | {type: "room.join"; commandId: string; playerId: string; name: string; reconnectToken: string; roomCode: string}
    | {type: "room.ready"; commandId: string; revision: number; ready: boolean}
    | {type: "room.addBot"; commandId: string; revision: number; seat?: Seat}
    | {type: "room.removeBot"; commandId: string; revision: number; seat: Seat}
    | {type: "game.start"; commandId: string; revision: number; seed?: string}
    | {type: "game.playCards"; commandId: string; revision: number; cardIds: string[]}
    | {type: "game.pass"; commandId: string; revision: number}
    | {type: "game.startRound"; commandId: string; revision: number; seed?: string}
    | {type: "session.resume"; commandId: string; playerId: string; reconnectToken: string; roomCode?: string}
    | {type: "ping"; commandId: string; sentAt: number};

export type ServerEvent =
    | {type: "room.snapshot"; revision: number; room: RoomSnapshot}
    | {type: "game.snapshot"; revision: number; game: PublicGameState}
    | {type: "game.actionAccepted"; revision: number; commandId: string}
    | {type: "game.actionRejected"; commandId: string; reason: string; code?: string; revision: number; room?: RoomSnapshot; game?: PublicGameState}
    | {type: "game.roundEnded"; revision: number; game: PublicGameState}
    | {type: "game.matchEnded"; revision: number}
    | {type: "player.connectionChanged"; playerId: string; connected: boolean; revision: number}
    | {type: "error"; message: string; commandId?: string}
    | {type: "pong"; commandId: string; sentAt: number; serverAt: number};

export interface Envelope<T> {
    to: "all" | string;
    event: T;
}

export function parseClientCommand(raw: string): ClientCommand | null {
    try {
        const value = JSON.parse(raw) as unknown;
        return isClientCommand(value) ? value : null;
    } catch {
        return null;
    }
}

export function isClientCommand(value: unknown): value is ClientCommand {
    if (!value || typeof value !== "object" || !("type" in value) || !("commandId" in value)) {
        return false;
    }
    const type = (value as {type: unknown}).type;
    return typeof type === "string" && typeof (value as {commandId: unknown}).commandId === "string";
}
