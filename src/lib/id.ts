export function createId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return `id-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

const ROOM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createRoomCode(): string {
    let code = "";
    for (let i = 0; i < 4; i += 1) {
        const index = Math.floor(Math.random() * ROOM_CHARS.length);
        code += ROOM_CHARS[index];
    }
    return code;
}

export function namespaceKey(namespace: string, code: string): string {
    return `${namespace}:${code.toUpperCase()}`;
}
