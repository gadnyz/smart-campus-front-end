const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const ISO_DATE = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
const LONG_DATE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Rend lisible un message de l'API : un identifiant technique est remplacé par son nom quand
 * l'écran le connaît (`labels`), sinon retiré ; une date ISO devient « 23 novembre 2026 ».
 */
export function readableApiText(text: string, labels?: ReadonlyMap<string, string>): string {
    return text
        .replace(UUID, (id) => labels?.get(id.toLowerCase()) ?? labels?.get(id) ?? '')
        .replace(ISO_DATE, (match, year: string, month: string, day: string) => {
            const date = new Date(Number(year), Number(month) - 1, Number(day));
            return Number.isNaN(date.getTime()) ? match : LONG_DATE.format(date);
        })
        .replace(/\s{2,}/g, ' ')
        .replace(/\s+([.,;:!?])/g, '$1')
        .trim();
}
