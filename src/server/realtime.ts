import {parseClientCommand, type ServerEvent} from "../protocol/messages.ts";
import {GameRoom, RoomRegistry} from "./room.ts";

export interface SocketLike {
    send(data: string): void;
    onMessage(handler: (data: string) => void): void;
    onClose(handler: () => void): void;
}

interface Binding {
    playerId: string;
    room: GameRoom;
}

export class RealtimeServer {
    readonly registry: RoomRegistry;
    private readonly bindings = new Map<SocketLike, Binding>();
    private readonly botTimers = new Map<GameRoom, ReturnType<typeof setTimeout>>();
    private readonly aiDelayMs: number;

    constructor(namespace: string, aiDelayMs = 420) {
        this.registry = new RoomRegistry(namespace);
        this.aiDelayMs = aiDelayMs;
    }

    attach(socket: SocketLike): void {
        socket.onMessage(raw => this.onMessage(socket, raw));
        socket.onClose(() => this.onClose(socket));
    }

    private onMessage(socket: SocketLike, raw: string): void {
        const command = parseClientCommand(raw);
        if (!command) {
            socket.send(JSON.stringify({type: "error", message: "無效指令"} satisfies ServerEvent));
            return;
        }
        if (command.type === "room.create") {
            const room = this.registry.create({playerId: command.playerId, name: command.name, reconnectToken: command.reconnectToken});
            this.bindings.set(socket, {playerId: command.playerId, room});
            this.deliver(room, [
                {to: command.playerId, event: {type: "game.actionAccepted", revision: room.revision, commandId: command.commandId}},
                {to: "all", event: {type: "room.snapshot", revision: room.revision, room: room.snapshot()}},
            ]);
            return;
        }
        if (command.type === "room.join") {
            const room = this.registry.get(command.roomCode);
            if (!room) {
                socket.send(JSON.stringify({type: "error", message: "搵唔到呢個房間", commandId: command.commandId} satisfies ServerEvent));
                return;
            }
            this.bindings.set(socket, {playerId: command.playerId, room});
            this.deliver(room, room.join({playerId: command.playerId, name: command.name, reconnectToken: command.reconnectToken}, command.commandId));
            return;
        }
        if (command.type === "session.resume") {
            const room = command.roomCode ? this.registry.get(command.roomCode) : this.bindings.get(socket)?.room;
            if (!room) {
                socket.send(JSON.stringify({type: "error", message: "重連失敗", commandId: command.commandId} satisfies ServerEvent));
                return;
            }
            this.bindings.set(socket, {playerId: command.playerId, room});
            this.deliver(room, room.handle(command.playerId, command));
            this.queueBot(room);
            return;
        }
        const binding = this.bindings.get(socket);
        if (!binding) {
            socket.send(JSON.stringify({type: "error", message: "尚未加入房間", commandId: command.commandId} satisfies ServerEvent));
            return;
        }
        this.deliver(binding.room, binding.room.handle(binding.playerId, command));
        this.queueBot(binding.room);
    }

    private onClose(socket: SocketLike): void {
        const binding = this.bindings.get(socket);
        this.bindings.delete(socket);
        if (!binding) {
            return;
        }
        this.deliver(binding.room, binding.room.markDisconnected(binding.playerId));
        this.queueBot(binding.room);
    }

    private deliver(room: GameRoom, envelopes: ReturnType<GameRoom["handle"]>): void {
        for (const envelope of envelopes) {
            for (const [socket, binding] of this.bindings) {
                if (binding.room !== room) {
                    continue;
                }
                if (envelope.to === "all" || envelope.to === binding.playerId) {
                    socket.send(JSON.stringify(envelope.event));
                }
            }
        }
    }

    private queueBot(room: GameRoom): void {
        const existing = this.botTimers.get(room);
        if (existing) {
            clearTimeout(existing);
        }
        if (!room.needsBot()) {
            return;
        }
        const timer = setTimeout(() => {
            this.botTimers.delete(room);
            this.deliver(room, room.playBot());
            this.queueBot(room);
        }, this.aiDelayMs);
        this.botTimers.set(room, timer);
    }
}
