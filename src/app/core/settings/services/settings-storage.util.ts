export function readJsonStorage<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) {
            return fallback;
        }

        return { ...fallback, ...(JSON.parse(raw) as Partial<T>) };
    } catch {
        return fallback;
    }
}

export function writeJsonStorage<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
}
