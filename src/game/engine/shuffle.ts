export function seedToNumber(seed: string): number {
    let hash = 2166136261;
    for (let i = 0; i < seed.length; i += 1) {
        hash ^= seed.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

export function mulberry32(seed: number): () => number {
    let state = seed >>> 0;
    return function next(): number {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function shuffle<T>(items: T[], seed: string): T[] {
    const rng = mulberry32(seedToNumber(seed));
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rng() * (i + 1));
        const current = arr[i];
        arr[i] = arr[j];
        arr[j] = current;
    }
    return arr;
}
