import { environment } from '@/environments/environment';

const absoluteUrlPattern = /^(https?:)?\/\//i;
const safeUrlPattern = /^(blob:|data:)/i;

export function resolveAvatarUrl(value: string | null | undefined): string {
    const url = value?.trim();

    if (!url) {
        return '';
    }

    if (absoluteUrlPattern.test(url) || safeUrlPattern.test(url)) {
        return url;
    }

    const baseUrl = environment.apiBaseUrl.replace(/\/$/, '');

    if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
    }

    return `${baseUrl}/${url}`;
}

export function getUserInitial(username?: string | null, email?: string | null): string {
    const source = username?.trim() || email?.trim() || '?';
    return source.charAt(0).toUpperCase();
}