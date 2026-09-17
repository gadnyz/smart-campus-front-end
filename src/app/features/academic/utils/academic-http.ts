export function asList<T>(body: unknown): T[] {
    if (Array.isArray(body)) {
        return body as T[];
    }

    if (body && typeof body === 'object' && 'content' in body) {
        const content = (body as { content?: T[] }).content;
        return Array.isArray(content) ? content : [];
    }

    return [];
}

export function refId(value: unknown): string | undefined {
    if (value == null || value === '') {
        return undefined;
    }

    if (typeof value === 'string' || typeof value === 'number') {
        return String(value);
    }

    if (typeof value === 'object' && 'id' in value) {
        const id = (value as { id?: unknown }).id;
        return id == null ? undefined : String(id);
    }

    return undefined;
}

export function refName(value: unknown): string | undefined {
    if (value && typeof value === 'object' && 'name' in value) {
        const name = (value as { name?: unknown }).name;
        return typeof name === 'string' ? name : undefined;
    }

    return undefined;
}

export function refCode(value: unknown): string | undefined {
    if (value && typeof value === 'object' && 'code' in value) {
        const code = (value as { code?: unknown }).code;
        return typeof code === 'string' ? code : undefined;
    }

    return undefined;
}
