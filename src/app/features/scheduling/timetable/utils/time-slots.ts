/** Créneaux proposés dans les listes d'heures : de 8h00 à 20h00, toutes les 30 minutes. */
export const FIRST_SLOT_MINUTES = 8 * 60;
export const LAST_SLOT_MINUTES = 20 * 60;
export const SLOT_STEP_MINUTES = 30;

export interface TimeSlotOption {
    value: string;
    /** Durée depuis le début, affichée à côté de l'heure de fin dans la liste. */
    hint?: string;
}

export function minutesOf(date: Date): number {
    return date.getHours() * 60 + date.getMinutes();
}

export function formatSlot(minutes: number): string {
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** Une heure du jour, à la date neutre utilisée par le formulaire. */
export function slotDate(minutes: number): Date {
    const date = new Date(1970, 0, 1, 0, 0, 0, 0);
    date.setMinutes(minutes);
    return date;
}

/**
 * Heure saisie au clavier : « 8 », « 8h », « 8h30 », « 08:30 », « 0830 », « 830 » ou « 8.30 ».
 * `null` si le texte n'est pas une heure valide.
 */
export function parseTimeText(text: string): number | null {
    const value = text.trim().toLowerCase().replace(/\s+/g, '');
    if (!value) {
        return null;
    }
    let hours: number;
    let minutes: number;
    const separated = /^(\d{1,2})(?:[h:.](\d{0,2}))?$/.exec(value);
    const compact = /^(\d{3,4})$/.exec(value);
    if (separated) {
        hours = Number(separated[1]);
        minutes = separated[2] ? Number(separated[2].padEnd(2, '0')) : 0;
    } else if (compact) {
        hours = Number(compact[1].slice(0, -2));
        minutes = Number(compact[1].slice(-2));
    } else {
        return null;
    }
    return hours <= 23 && minutes <= 59 ? hours * 60 + minutes : null;
}

/** « 1 h 30 », « 45 min », « 2 h ». */
export function durationLabel(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (hours === 0) {
        return `${rest} min`;
    }
    return rest ? `${hours} h ${String(rest).padStart(2, '0')}` : `${hours} h`;
}

/**
 * Créneaux de la liste. Pour l'heure de fin (`after` renseigné), seuls ceux qui suivent le début
 * sont proposés, avec la durée, comme dans Teams : « 10:00 · 2 h ».
 */
export function slotOptions(after: number | null = null): TimeSlotOption[] {
    const options: TimeSlotOption[] = [];
    for (let minutes = FIRST_SLOT_MINUTES; minutes <= LAST_SLOT_MINUTES; minutes += SLOT_STEP_MINUTES) {
        if (after !== null && minutes <= after) {
            continue;
        }
        const value = formatSlot(minutes);
        options.push(after === null ? { value } : { value, hint: durationLabel(minutes - after) });
    }
    return options;
}
