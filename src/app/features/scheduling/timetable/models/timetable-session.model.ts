import { SessionType } from './timetable-entry.model';

/** Jours ISO : 1 = lundi … 7 = dimanche, dans l'ordre de la semaine d'un horaire. */
export type WeekDay = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const WEEK_DAY_OPTIONS: { label: string; value: WeekDay }[] = [
    { label: 'Lundi', value: 1 },
    { label: 'Mardi', value: 2 },
    { label: 'Mercredi', value: 3 },
    { label: 'Jeudi', value: 4 },
    { label: 'Vendredi', value: 5 },
    { label: 'Samedi', value: 6 },
    { label: 'Dimanche', value: 7 }
];

export function weekDayLabel(day: WeekDay): string {
    return WEEK_DAY_OPTIONS.find((option) => option.value === day)?.label ?? String(day);
}

/**
 * Une ligne du tableau des sessions : un même cours, aux mêmes heures et dans la même salle,
 * répété sur un ou plusieurs jours de la semaine. L'API ne connaît que des séances datées :
 * une ligne de N jours correspond à N séances.
 */
export interface SessionLine {
    course_id: string;
    course_assignment_id: string;
    start_hour: string;
    end_hour: string;
    days: WeekDay[];
    room_id: string;
    session_type: SessionType;
    note: string;
    /** Séance déjà enregistrée pour chaque jour de la ligne (mode édition). */
    entry_ids: Partial<Record<WeekDay, string>>;
}
