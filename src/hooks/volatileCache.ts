const volatileCache = new Map<string, unknown>();

export function getVolatile<T>(key: string, initialValue: T): T {
    if (!volatileCache.has(key)) {
        volatileCache.set(key, initialValue);
    }
    return volatileCache.get(key) as T;
}

export function setVolatile<T>(key: string, value: T) {
    volatileCache.set(key, value);
}

export function clearVolatile(key: string) {
    volatileCache.delete(key);
}
