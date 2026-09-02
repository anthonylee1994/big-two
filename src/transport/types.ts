import type {ClientCommand, ServerEvent} from "../protocol/messages.ts";

export interface Transport {
    readonly kind: "local" | "ws";
    send(command: ClientCommand): void;
    subscribe(handler: (event: ServerEvent) => void): () => void;
    disconnect(): void;
}
