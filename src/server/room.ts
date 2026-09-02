import {chooseAction} from "../game/ai/strategy.ts";
import type {GameState, Seat} from "../game/domain/types.ts";
import {applyAction, createGame, toPublicSnapshot} from "../game/engine/index.ts";
import {createId, createRoomCode} from "../lib/id.ts";
import type {ClientCommand, Envelope, RoomSeatView, RoomSnapshot, ServerEvent} from "../protocol/messages.ts";

const BOT_NAMES = ["電腦一", "電腦二", "電腦三", "電腦四"];
const DISCONNECT_MS = 30_000;

interface SeatState {
    playerId: string;
    name: string;
    type: "human" | "bot";
    ready: boolean;
    connected: boolean;
    reconnectToken: string;
    disconnectAt: number | null;
}

export interface RoomOptions {
    namespace?: string;
    now?: () => number;
    randomCode?: () => string;
    randomSeed?: () => string;
}

export class GameRoom {
    code: string;
    hostId: string;
    seats: (SeatState | null)[] = [null, null, null, null];
    revision = 1;
    game: GameState | null = null;
    status: RoomSnapshot["status"] = "lobby";
    private readonly commandIds = new Set<string>();
    private readonly now: () => number;
    private readonly randomSeed: () => string;

    constructor(host: {playerId: string; name: string; reconnectToken: string}, options: RoomOptions = {}) {
        this.code = options.randomCode?.() ?? createRoomCode();
        this.hostId = host.playerId;
        this.now = options.now ?? Date.now;
        this.randomSeed = options.randomSeed ?? createId;
        this.seats[0] = {
            playerId: host.playerId,
            name: host.name,
            type: "human",
            ready: false,
            connected: true,
            reconnectToken: host.reconnectToken,
            disconnectAt: null,
        };
    }

    snapshot(): RoomSnapshot {
        return {
            code: this.code,
            hostId: this.hostId,
            seats: this.seats.map(seat => (seat ? toSeatView(seat) : null)),
            status: this.status,
            revision: this.revision,
        };
    }

    findByToken(playerId: string, token: string): SeatState | null {
        return this.seats.find(seat => seat?.playerId === playerId && seat.reconnectToken === token) ?? null;
    }

    handle(playerId: string, command: ClientCommand): Envelope<ServerEvent>[] {
        if (command.type !== "ping" && this.commandIds.has(command.commandId)) {
            return this.reject(playerId, command.commandId, "duplicateCommand", "Command already processed");
        }
        if (command.type !== "room.create" && command.type !== "room.join" && command.type !== "session.resume" && command.type !== "ping") {
            if (!("revision" in command) || command.revision !== this.revision) {
                return this.reject(playerId, command.commandId, "staleRevision", "Stale revision");
            }
        }

        switch (command.type) {
            case "ping":
                return [{to: playerId, event: {type: "pong", commandId: command.commandId, sentAt: command.sentAt, serverAt: this.now()}}];
            case "room.ready":
                return this.ready(playerId, command.commandId, command.ready);
            case "room.addBot":
                return this.addBot(playerId, command.commandId, command.seat);
            case "room.removeBot":
                return this.removeBot(playerId, command.commandId, command.seat);
            case "game.start":
                return this.startGame(playerId, command.commandId, command.seed);
            case "game.playCards":
                return this.play(playerId, command.commandId, command.cardIds);
            case "game.pass":
                return this.pass(playerId, command.commandId);
            case "game.startRound":
                return this.startRound(playerId, command.commandId, command.seed);
            case "session.resume":
                return this.resume(playerId, command.reconnectToken);
            default:
                return [{to: playerId, event: {type: "error", message: "Unsupported command", commandId: command.commandId}}];
        }
    }

    join(player: {playerId: string; name: string; reconnectToken: string}, commandId: string): Envelope<ServerEvent>[] {
        if (this.status !== "lobby") {
            return [{to: player.playerId, event: {type: "error", message: "牌局已經開始", commandId}}];
        }
        const empty = this.seats.findIndex(seat => seat === null);
        if (empty < 0) {
            return [{to: player.playerId, event: {type: "error", message: "房間已滿", commandId}}];
        }
        this.seats[empty] = {
            playerId: player.playerId,
            name: player.name,
            type: "human",
            ready: false,
            connected: true,
            reconnectToken: player.reconnectToken,
            disconnectAt: null,
        };
        this.remember(commandId);
        this.revision += 1;
        return this.broadcastRoom(commandId);
    }

    markDisconnected(playerId: string): Envelope<ServerEvent>[] {
        const seat = this.seats.find(item => item?.playerId === playerId);
        if (!seat || seat.type === "bot") {
            return [];
        }
        seat.connected = false;
        seat.disconnectAt = this.now() + DISCONNECT_MS;
        this.revision += 1;
        return [{to: "all", event: {type: "player.connectionChanged", playerId, connected: false, revision: this.revision}}, ...this.roomEvents()];
    }

    tick(now = this.now()): Envelope<ServerEvent>[] {
        let changed = false;
        for (const seat of this.seats) {
            if (seat && seat.type === "human" && !seat.connected && seat.disconnectAt !== null && now >= seat.disconnectAt) {
                seat.type = "bot";
                seat.connected = true;
                seat.ready = true;
                seat.disconnectAt = null;
                if (this.game) {
                    const player = this.game.players.find(item => item.id === seat.playerId);
                    if (player) {
                        player.type = "bot";
                        player.connectionStatus = "bot";
                    }
                }
                changed = true;
            }
        }
        if (!changed) {
            return [];
        }
        this.revision += 1;
        return [...this.roomEvents(), ...this.gameEvents()];
    }

    private resume(playerId: string, token: string): Envelope<ServerEvent>[] {
        const seat = this.findByToken(playerId, token);
        if (!seat) {
            return [{to: playerId, event: {type: "error", message: "重連失敗"}}];
        }
        seat.connected = true;
        seat.disconnectAt = null;
        if (seat.type === "bot") {
            const currentSeat = this.game?.currentPlayerSeat;
            const occupying = this.game?.players.find(player => player.id === seat.playerId);
            if (occupying && occupying.seat !== currentSeat) {
                seat.type = "human";
                occupying.type = "human";
                occupying.connectionStatus = "connected";
            }
        } else if (this.game) {
            const occupying = this.game.players.find(player => player.id === seat.playerId);
            if (occupying) {
                occupying.connectionStatus = "connected";
            }
        }
        this.revision += 1;
        return [{to: "all", event: {type: "player.connectionChanged", playerId, connected: true, revision: this.revision}}, ...this.roomEvents(), ...this.gameEvents()];
    }

    private ready(playerId: string, commandId: string, ready: boolean): Envelope<ServerEvent>[] {
        const seat = this.seats.find(item => item?.playerId === playerId);
        if (!seat || this.status !== "lobby") {
            return this.reject(playerId, commandId, "invalidPhase", "而家唔可以準備");
        }
        seat.ready = ready;
        this.remember(commandId);
        this.revision += 1;
        return this.broadcastRoom(commandId);
    }

    private addBot(playerId: string, commandId: string, seat?: Seat): Envelope<ServerEvent>[] {
        if (playerId !== this.hostId) {
            return this.reject(playerId, commandId, "forbidden", "只有房主可以加電腦");
        }
        const target = seat ?? (this.seats.findIndex(item => item === null) as Seat | -1);
        if (target < 0 || this.seats[target]) {
            return this.reject(playerId, commandId, "invalidCards", "冇空位");
        }
        const usedNames = new Set(this.seats.filter(Boolean).map(item => item!.name));
        const name = BOT_NAMES.find(item => !usedNames.has(item)) ?? `電腦${target + 1}`;
        this.seats[target] = {
            playerId: createId(),
            name,
            type: "bot",
            ready: true,
            connected: true,
            reconnectToken: createId(),
            disconnectAt: null,
        };
        this.remember(commandId);
        this.revision += 1;
        return this.broadcastRoom(commandId);
    }

    private removeBot(playerId: string, commandId: string, seat: Seat): Envelope<ServerEvent>[] {
        if (playerId !== this.hostId) {
            return this.reject(playerId, commandId, "forbidden", "只有房主可以移除電腦");
        }
        const current = this.seats[seat];
        if (!current || current.type !== "bot") {
            return this.reject(playerId, commandId, "invalidCards", "呢個位唔係電腦");
        }
        this.seats[seat] = null;
        this.remember(commandId);
        this.revision += 1;
        return this.broadcastRoom(commandId);
    }

    private startGame(playerId: string, commandId: string, seed?: string): Envelope<ServerEvent>[] {
        if (playerId !== this.hostId) {
            return this.reject(playerId, commandId, "forbidden", "只有房主可以開始");
        }
        if (this.seats.some(seat => seat === null)) {
            return this.reject(playerId, commandId, "invalidPhase", "未坐滿四個人");
        }
        if (this.seats.some(seat => seat && seat.type === "human" && !seat.ready)) {
            return this.reject(playerId, commandId, "invalidPhase", "仲有人未準備");
        }
        const players = this.seats.map(seat => ({id: seat!.playerId, name: seat!.name, type: seat!.type}));
        this.game = createGame({players, seed: seed ?? this.randomSeed()});
        this.status = this.game.phase === "roundEnded" ? "roundResult" : "playing";
        this.remember(commandId);
        this.revision += 1;
        return [...this.broadcastRoom(commandId), ...this.gameEvents()];
    }

    private startRound(playerId: string, commandId: string, seed?: string): Envelope<ServerEvent>[] {
        if (playerId !== this.hostId) {
            return this.reject(playerId, commandId, "forbidden", "只有房主可以開下一局");
        }
        if (!this.game) {
            return this.reject(playerId, commandId, "invalidPhase", "未有牌局");
        }
        const result = applyAction(this.game, {
            type: "startRound",
            playerId,
            commandId,
            revision: this.game.revision,
            seed: seed ?? this.randomSeed(),
        });
        if (!result.ok) {
            return this.reject(playerId, commandId, result.error.code, result.error.message);
        }
        this.game = result.state;
        this.status = this.game.phase === "roundEnded" ? "roundResult" : "playing";
        this.remember(commandId);
        this.revision += 1;
        return [...this.broadcastRoom(commandId), ...this.gameEvents()];
    }

    private play(playerId: string, commandId: string, cardIds: string[]): Envelope<ServerEvent>[] {
        return this.applyGame(playerId, commandId, {type: "playCards", playerId, commandId, revision: this.game?.revision ?? 0, cardIds});
    }

    private pass(playerId: string, commandId: string): Envelope<ServerEvent>[] {
        return this.applyGame(playerId, commandId, {type: "pass", playerId, commandId, revision: this.game?.revision ?? 0});
    }

    private applyGame(playerId: string, commandId: string, action: Parameters<typeof applyAction>[1]): Envelope<ServerEvent>[] {
        if (!this.game || this.status === "lobby") {
            return this.reject(playerId, commandId, "invalidPhase", "牌局未開始");
        }
        const humanSeat = this.seats.find(seat => seat?.playerId === playerId);
        if (humanSeat?.type === "bot" && this.game.players.find(player => player.id === playerId)?.type === "bot") {
            // bot takeover is allowed to play as that player id
        }
        const result = applyAction(this.game, action);
        if (!result.ok) {
            return this.reject(playerId, commandId, result.error.code, result.error.message);
        }
        this.game = result.state;
        this.status = this.game.phase === "roundEnded" ? "roundResult" : "playing";
        this.remember(commandId);
        this.revision += 1;
        const events: Envelope<ServerEvent>[] = [...this.broadcastRoom(commandId), ...this.gameEvents()];
        if (this.game.phase === "roundEnded") {
            for (const player of this.occupied()) {
                events.push({to: player.playerId, event: {type: "game.roundEnded", revision: this.revision, game: toPublicSnapshot(this.game, player.playerId)}});
            }
        }
        return events;
    }

    needsBot(): boolean {
        if (!this.game || this.game.phase !== "playing") {
            return false;
        }
        const current = this.game.players[this.game.currentPlayerSeat];
        const seat = this.seats[current.seat];
        return Boolean(seat && (seat.type === "bot" || current.type === "bot"));
    }

    playBot(): Envelope<ServerEvent>[] {
        if (!this.needsBot() || !this.game) {
            return [];
        }
        const current = this.game.players[this.game.currentPlayerSeat];
        const decision = chooseAction({hand: this.game.hands[current.seat], snapshot: toPublicSnapshot(this.game, current.id)});
        const commandId = createId();
        const action =
            decision.type === "play"
                ? {type: "playCards" as const, playerId: current.id, commandId, revision: this.game.revision, cardIds: decision.cardIds}
                : {type: "pass" as const, playerId: current.id, commandId, revision: this.game.revision};
        return this.applyGame(current.id, commandId, action);
    }

    private occupied(): SeatState[] {
        return this.seats.filter((seat): seat is SeatState => seat !== null);
    }

    private remember(commandId: string): void {
        this.commandIds.add(commandId);
    }

    private reject(playerId: string, commandId: string, code: string, reason: string): Envelope<ServerEvent>[] {
        return [
            {
                to: playerId,
                event: {
                    type: "game.actionRejected",
                    commandId,
                    code,
                    reason,
                    revision: this.revision,
                    room: this.snapshot(),
                    game: this.game ? toPublicSnapshot(this.game, playerId) : undefined,
                },
            },
        ];
    }

    private broadcastRoom(commandId: string): Envelope<ServerEvent>[] {
        return [{to: "all", event: {type: "game.actionAccepted", revision: this.revision, commandId}}, ...this.roomEvents()];
    }

    private roomEvents(): Envelope<ServerEvent>[] {
        return [{to: "all", event: {type: "room.snapshot", revision: this.revision, room: this.snapshot()}}];
    }

    private gameEvents(): Envelope<ServerEvent>[] {
        if (!this.game) {
            return [];
        }
        return this.occupied().map(seat => ({
            to: seat.playerId,
            event: {type: "game.snapshot" as const, revision: this.revision, game: toPublicSnapshot(this.game!, seat.playerId)},
        }));
    }
}

function toSeatView(seat: SeatState): RoomSeatView {
    return {
        playerId: seat.playerId,
        name: seat.name,
        type: seat.type,
        ready: seat.ready,
        connected: seat.connected,
    };
}

export class RoomRegistry {
    private readonly rooms = new Map<string, GameRoom>();

    constructor(private readonly namespace: string) {}

    create(player: {playerId: string; name: string; reconnectToken: string}, options?: RoomOptions): GameRoom {
        const room = new GameRoom(player, options);
        this.rooms.set(this.key(room.code), room);
        return room;
    }

    get(code: string): GameRoom | undefined {
        return this.rooms.get(this.key(code));
    }

    private key(code: string): string {
        return `${this.namespace}:${code.toUpperCase()}`;
    }
}
