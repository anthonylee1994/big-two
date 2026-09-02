import type {ClientCommand, ServerEvent} from "../protocol/messages.ts";
import type {Transport} from "./types.ts";

function defaultWsUrl(): string {
    const configured = import.meta.env.VITE_WS_URL as string | undefined;
    if (configured) {
        return configured;
    }
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const path = import.meta.env.DEV ? "/ws" : "/api/ws";
    return `${protocol}//${window.location.host}${path}`;
}

export class WebSocketTransport implements Transport {
    readonly kind = "ws" as const;
    private socket: WebSocket | null = null;
    private readonly listeners = new Set<(event: ServerEvent) => void>();
    private readonly url: string;
    private readonly queue: ClientCommand[] = [];
    private attempts = 0;
    private closed = false;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly onStatus: (status: "connecting" | "connected" | "reconnecting" | "offline") => void;
    private readonly resume: () => ClientCommand | null;

    constructor(options: {url?: string; onStatus: WebSocketTransport["onStatus"]; resume: () => ClientCommand | null}) {
        this.url = options.url ?? defaultWsUrl();
        this.onStatus = options.onStatus;
        this.resume = options.resume;
        this.connect();
    }

    send(command: ClientCommand): void {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(command));
            return;
        }
        this.queue.push(command);
    }

    subscribe(handler: (event: ServerEvent) => void): () => void {
        this.listeners.add(handler);
        return () => {
            this.listeners.delete(handler);
        };
    }

    disconnect(): void {
        this.closed = true;
        if (this.reconnectTimer !== null) {
            clearTimeout(this.reconnectTimer);
        }
        this.socket?.close();
        this.socket = null;
        this.listeners.clear();
    }

    private connect(): void {
        if (this.closed) {
            return;
        }
        this.onStatus(this.attempts === 0 ? "connecting" : "reconnecting");
        const socket = new WebSocket(this.url);
        this.socket = socket;
        socket.addEventListener("open", () => {
            this.attempts = 0;
            this.onStatus("connected");
            const resume = this.resume();
            if (resume) {
                socket.send(JSON.stringify(resume));
            }
            while (this.queue.length > 0) {
                socket.send(JSON.stringify(this.queue.shift()));
            }
        });
        socket.addEventListener("message", event => {
            try {
                const payload = JSON.parse(String(event.data)) as ServerEvent;
                for (const listener of this.listeners) {
                    listener(payload);
                }
            } catch {
                for (const listener of this.listeners) {
                    listener({type: "error", message: "伺服器訊息無法解讀"});
                }
            }
        });
        socket.addEventListener("close", () => {
            if (this.closed) {
                return;
            }
            this.onStatus("reconnecting");
            this.attempts += 1;
            const wait = Math.min(8000, 400 * 2 ** Math.min(this.attempts, 5));
            this.reconnectTimer = setTimeout(() => this.connect(), wait);
        });
        socket.addEventListener("error", () => {
            socket.close();
        });
    }
}
