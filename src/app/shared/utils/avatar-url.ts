import { environment } from '@/environments/environment';

const absoluteUrlPattern = /^(https?:)?\/\//i;
const safeUrlPattern = /^(blob:|data:)/i;

function resolveApiOrigin(): string {
    const configured = environment.apiBaseUrl?.trim().replace(/\/$/, '') ?? '';

    if (configured) {
        return configured;
    }

    if (typeof window !== 'undefined' && window.location?.origin) {
        return window.location.origin;
    }

    return '';
}

export function resolveAvatarUrl(value: string | null | undefined): string {
    const url = value?.trim();

    if (!url) {
        return '';
    }

    if (absoluteUrlPattern.test(url) || safeUrlPattern.test(url)) {
        return url;
    }

    const baseUrl = resolveApiOrigin();

    if (!baseUrl) {
        return url.startsWith('/') ? url : `/${url}`;
    }

    if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
    }

    return `${baseUrl}/${url}`;
}

export function getUserInitial(username?: string | null, email?: string | null): string {
    const source = username?.trim() || email?.trim() || '?';
    return source.charAt(0).toUpperCase();
}
