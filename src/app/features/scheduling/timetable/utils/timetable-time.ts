/**
 * Dates et heures « civiles » échangées avec l'API : `yyyy-MM-dd` et `HH:mm:ss`, sans fuseau.
 * Les conversions passent par les accesseurs locaux de `Date` (jamais `toISOString`, qui
 * décalerait d'un jour une date saisie près de minuit hors UTC).
 */

export function toApiDate(value: Date): string {
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${value.getFullYear()}-${month}-${day}`;
}

export function toApiTime(value: Date): string {
    const hours = String(value.getHours()).padStart(2, '0');
    const minutes = String(value.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}:00`;
}

export function parseApiDate(value: string): Date {
    const [year, month, day] = value.split('-').map((part) => Number(part));
    return new Date(year || 0, (month || 1) - 1, day || 1);
}

export function parseApiTime(value: string): Date {
    const [hours, minutes] = value.split(':').map((part) => Number(part));
    const date = new Date();
    date.setHours(hours || 0, minutes || 0, 0, 0);
    return date;
}

/** `HH:mm`, quelle que soit la précision renvoyée par l'API (`08:00` ou `08:00:00`). */
export function formatEntryTime(value: string): string {
    return value.slice(0, 5);
}

export function isEndAfterStart(start: string, end: string): boolean {
    return formatEntryTime(end) > formatEntryTime(start);
}

/** Intervalles semi-ouverts : 08h-10h et 10h-12h ne se chevauchent pas. */
export function rangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
    return formatEntryTime(startA) < formatEntryTime(endB) && formatEntryTime(startB) < formatEntryTime(endA);
}

/** Le lundi de la semaine ISO contenant `value`. */
export function mondayOf(value: Date): Date {
    const mondayOffset = value.getDay() === 0 ? -6 : 1 - value.getDay();
    return new Date(value.getFullYear(), value.getMonth(), value.getDate() + mondayOffset);
}

export function addDays(value: string, days: number): string {
    const date = parseApiDate(value);
    return toApiDate(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days));
}

export function weekBounds(value: Date): { start: string; end: string } {
    const monday = toApiDate(mondayOf(value));
    return { start: monday, end: addDays(monday, 6) };
}

export function formatWeekStart(value: string): string {
    if (!value) {
        return '';
    }
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(parseApiDate(value));
}
