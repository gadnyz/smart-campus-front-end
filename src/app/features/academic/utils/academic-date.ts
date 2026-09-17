export function toApiDate(value: Date | string | null | undefined): string | null {
    if (!value) {
        return null;
    }

    if (typeof value === 'string') {
        const slice = value.slice(0, 10);
        return slice || null;
    }

    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function toDateValue(value: string | null | undefined): Date | null {
    if (!value) {
        return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

export function blankToNull(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
}
