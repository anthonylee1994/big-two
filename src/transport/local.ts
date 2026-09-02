import {createId} from "../lib/id.ts";
import type {ClientCommand, Envelope, ServerEvent} from "../protocol/messages.ts";
import {GameRoom} from "../server/room.ts";
import type {Transport} from "./types.ts";

export interface LocalTransportOptions {
    aiDelayMs?: number;
    playerId: string;
    name: string;
    reconnectToken: string;
}

export class LocalTransport implements Transport {
    readonly kind = "local" as const;
    readonly room: GameRoom;
    private readonly playerId: string;
    private readonly listeners = new Set<(event: ServerEvent) => void>();
    private readonly aiDelayMs: number;
    private botTimer: ReturnType<typeof setTimeout> | null = null;
    private closed = false;

    constructor(options: LocalTransportOptions) {
        this.playerId = options.playerId;
        this.aiDelayMs = options.aiDelayMs ?? 450;
        this.room = new GameRoom({playerId: options.playerId, name: options.name, reconnectToken: options.reconnectToken}, {randomCode: () => "LOCAL"});
    }

    startOfflineMatch(): void {
        this.emit([{to: "all", event: {type: "room.snapshot", revision: this.room.revision, room: this.room.snapshot()}}]);
        for (let i = 0; i < 3; i += 1) {
            this.send({type: "room.addBot", commandId: createId(), revision: this.room.revision});
        }
        this.send({type: "room.ready", commandId: createId(), revision: this.room.revision, ready: true});
        this.send({type: "game.start", commandId: createId(), revision: this.room.revision});
    }

    send(command: ClientCommand): void {
        if (this.closed) {
            return;
        }
        const events = this.room.handle(this.playerId, command);
        this.emit(events);
        this.queueBot();
    }

    subscribe(handler: (event: ServerEvent) => void): () => void {
        this.listeners.add(handler);
        handler({type: "room.snapshot", revision: this.room.revision, room: this.room.snapshot()});
        return () => {
            this.listeners.delete(handler);
        };
    }

    disconnect(): void {
        this.closed = true;
        if (this.botTimer !== null) {
            clearTimeout(this.botTimer);
            this.botTimer = null;
        }
        this.listeners.clear();
    }

    private emit(envelopes: Envelope<ServerEvent>[]): void {
        for (const envelope of envelopes) {
            if (envelope.to === "all" || envelope.to === this.playerId) {
                for (const listener of this.listeners) {
                    listener(envelope.event);
                }
            }
        }
    }

    private queueBot(): void {
        if (this.closed || !this.room.needsBot()) {
            return;
        }
        if (this.botTimer !== null) {
            clearTimeout(this.botTimer);
        }
        this.botTimer = setTimeout(() => {
            this.botTimer = null;
            if (this.closed || !this.room.needsBot()) {
                return;
            }
            this.emit(this.room.playBot());
            this.queueBot();
        }, this.aiDelayMs);
    }
}
