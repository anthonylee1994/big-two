export interface DurableStore {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
}

export class MemoryStore implements DurableStore {
    private readonly data = new Map<string, string>();

    async get(key: string): Promise<string | null> {
        return this.data.get(key) ?? null;
    }

    async set(key: string, value: string): Promise<void> {
        this.data.set(key, value);
    }

    async delete(key: string): Promise<void> {
        this.data.delete(key);
    }
}

export class UpstashStore implements DurableStore {
    constructor(
        private readonly url: string,
        private readonly token: string
    ) {}

    async get(key: string): Promise<string | null> {
        const response = await fetch(`${this.url}/get/${encodeURIComponent(key)}`, {
            headers: {Authorization: `Bearer ${this.token}`},
        });
        if (!response.ok) {
            throw new Error(`store get failed: ${response.status}`);
        }
        const body = (await response.json()) as {result: string | null};
        return body.result;
    }

    async set(key: string, value: string): Promise<void> {
        const response = await fetch(`${this.url}/set/${encodeURIComponent(key)}`, {
            method: "POST",
            headers: {Authorization: `Bearer ${this.token}`, "Content-Type": "application/json"},
            body: JSON.stringify({value}),
        });
        if (!response.ok) {
            throw new Error(`store set failed: ${response.status}`);
        }
    }

    async delete(key: string): Promise<void> {
        const response = await fetch(`${this.url}/del/${encodeURIComponent(key)}`, {
            headers: {Authorization: `Bearer ${this.token}`},
        });
        if (!response.ok) {
            throw new Error(`store delete failed: ${response.status}`);
        }
    }
}

function readProcessEnv(): Record<string, string | undefined> {
    const scope = globalThis as {process?: {env?: Record<string, string | undefined>}};
    return scope.process?.env ?? {};
}

export function createStoreFromEnv(env: Record<string, string | undefined> = readProcessEnv()): DurableStore {
    const url = env.UPSTASH_REDIS_REST_URL;
    const token = env.UPSTASH_REDIS_REST_TOKEN;
    if (url && token) {
        return new UpstashStore(url, token);
    }
    return new MemoryStore();
}
