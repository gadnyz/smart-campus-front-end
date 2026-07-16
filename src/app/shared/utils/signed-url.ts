/**
 * Helpers for S3/MinIO-style pre-signed URLs used by candidate document `file_url`.
 */

function parseQuery(url: string): URLSearchParams | null {
    try {
        return new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost').searchParams;
    } catch {
        return null;
    }
}

/**
 * Returns true when the signed URL is already expired or will expire within `skewMs`.
 * Supports AWS Signature V4 (`X-Amz-Date` + `X-Amz-Expires`) and generic `Expires` (epoch seconds).
 */
export function isSignedUrlExpiredOrExpiring(
    url: string | null | undefined,
    skewMs = 60_000
): boolean {
    if (!url) {
        return true;
    }

    const params = parseQuery(url);
    if (!params) {
        return false;
    }

    const amzDate = params.get('X-Amz-Date') ?? params.get('x-amz-date');
    const amzExpires = params.get('X-Amz-Expires') ?? params.get('x-amz-expires');

    if (amzDate && amzExpires) {
        const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(amzDate);
        if (!match) {
            return false;
        }

        const signedAt = Date.UTC(
            Number(match[1]),
            Number(match[2]) - 1,
            Number(match[3]),
            Number(match[4]),
            Number(match[5]),
            Number(match[6])
        );
        const expiresAt = signedAt + Number(amzExpires) * 1000;
        return Number.isFinite(expiresAt) && Date.now() >= expiresAt - skewMs;
    }

    const expires = params.get('Expires') ?? params.get('expires');
    if (expires && /^\d+$/.test(expires)) {
        const expiresAt = Number(expires) * 1000;
        return Number.isFinite(expiresAt) && Date.now() >= expiresAt - skewMs;
    }

    return false;
}
