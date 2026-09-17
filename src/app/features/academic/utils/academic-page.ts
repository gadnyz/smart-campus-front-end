import { PagedResponse } from '../models/academic-reference.model';
import { asList } from './academic-http';

export function toPaged<T>(body: unknown, mapItem: (raw: unknown) => T): PagedResponse<T> {
    if (Array.isArray(body)) {
        const content = body.map(mapItem);
        return {
            content,
            page: 0,
            size: content.length,
            total_elements: content.length,
            total_pages: 1
        };
    }

    const source = (body ?? {}) as Record<string, unknown>;
    const content = asList(body).map(mapItem);
    const page = Number(source['page'] ?? source['number'] ?? 0);
    const size = Number(source['size'] ?? content.length);
    const totalElements = Number(source['total_elements'] ?? source['totalElements'] ?? content.length);
    const totalPages = Number(source['total_pages'] ?? source['totalPages'] ?? (size ? Math.ceil(totalElements / size) : 1));

    return {
        content,
        page,
        size,
        total_elements: totalElements,
        total_pages: totalPages || 1
    };
}
