import { TimetableEntry, TimetableEntryItemRequest, UpdateTimetableEntryRequest } from '../models/timetable-entry.model';
import { SessionLine, WeekDay } from '../models/timetable-session.model';
import { addDays, formatEntryTime, parseApiDate, rangesOverlap } from './timetable-time';

const DAY_MS = 24 * 60 * 60 * 1000;

export function dateOfDay(weekStart: string, day: WeekDay): string {
    return addDays(weekStart, day - 1);
}

/** Jour ISO de `date` dans la semaine commençant le lundi `weekStart`, ou `null` hors semaine. */
export function dayOfWeek(weekStart: string, date: string): WeekDay | null {
    const offset = Math.round((parseApiDate(date).getTime() - parseApiDate(weekStart).getTime()) / DAY_MS);
    return offset >= 0 && offset <= 6 ? ((offset + 1) as WeekDay) : null;
}

/**
 * Regroupe les séances enregistrées en lignes : les séances d'une même affectation, aux mêmes
 * heures, dans la même salle et du même type ne forment qu'une ligne, sur plusieurs jours.
 */
export function groupEntriesIntoLines(entries: readonly TimetableEntry[], weekStart: string): SessionLine[] {
    const lines: SessionLine[] = [];
    const lineByKey = new Map<string, SessionLine>();

    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.start_hour.localeCompare(b.start_hour));
    for (const entry of sorted) {
        const day = dayOfWeek(weekStart, entry.date);
        if (day === null) {
            continue;
        }
        const key = [
            entry.course_assignment_id,
            formatEntryTime(entry.start_hour),
            formatEntryTime(entry.end_hour),
            entry.room_id,
            entry.session_type,
            entry.note
        ].join('|');

        const existing = lineByKey.get(key);
        if (existing && !existing.days.includes(day)) {
            existing.days.push(day);
            existing.entry_ids[day] = entry.id;
            continue;
        }

        const line: SessionLine = {
            course_id: entry.course_id,
            course_assignment_id: entry.course_assignment_id,
            start_hour: entry.start_hour,
            end_hour: entry.end_hour,
            days: [day],
            room_id: entry.room_id,
            session_type: entry.session_type,
            note: entry.note,
            entry_ids: { [day]: entry.id }
        };
        lineByKey.set(key, line);
        lines.push(line);
    }

    return lines.sort((a, b) => a.days[0] - b.days[0] || a.start_hour.localeCompare(b.start_hour));
}

/**
 * Lignes qui se chevauchent un même jour. Elles appartiennent toutes au même horaire, donc à la
 * même promotion : tout chevauchement est un conflit, quels que soient la salle ou le cours.
 * Renvoie, pour chaque ligne en conflit, les index des lignes qu'elle chevauche.
 */
export function findOverlappingLines(lines: readonly Pick<SessionLine, 'days' | 'start_hour' | 'end_hour'>[]): Map<number, number[]> {
    const conflicts = new Map<number, number[]>();
    const add = (index: number, other: number) => conflicts.set(index, [...(conflicts.get(index) ?? []), other]);

    for (let i = 0; i < lines.length; i++) {
        for (let j = i + 1; j < lines.length; j++) {
            const a = lines[i];
            const b = lines[j];
            if (!a.start_hour || !a.end_hour || !b.start_hour || !b.end_hour) {
                continue;
            }
            const sharesDay = a.days.some((day) => b.days.includes(day));
            if (sharesDay && rangesOverlap(a.start_hour, a.end_hour, b.start_hour, b.end_hour)) {
                add(i, j);
                add(j, i);
            }
        }
    }
    return conflicts;
}

/** Ligne et jour d'origine d'une séance à écrire, pour y rattacher une erreur du backend. */
export interface PlannedEntry {
    line: number;
    day: WeekDay;
}

export interface SavePlan {
    toDelete: string[];
    toUpdate: (PlannedEntry & { id: string; payload: UpdateTimetableEntryRequest })[];
    toCreate: (PlannedEntry & { payload: TimetableEntryItemRequest })[];
}

/**
 * Ce qu'il faut écrire pour que le serveur reflète les lignes : les séances enregistrées qui ne
 * sont plus couvertes par aucune ligne sont supprimées, celles qui ont changé sont mises à jour,
 * et chaque jour sans séance enregistrée en crée une.
 */
export function planSave(lines: readonly SessionLine[], weekStart: string, persisted: readonly TimetableEntry[]): SavePlan {
    const persistedById = new Map(persisted.map((entry) => [entry.id, entry]));
    const kept = new Set<string>();
    const plan: SavePlan = { toDelete: [], toUpdate: [], toCreate: [] };

    lines.forEach((line, index) => {
        for (const day of [...line.days].sort((a, b) => a - b)) {
            const payload: TimetableEntryItemRequest = {
                date: dateOfDay(weekStart, day),
                start_hour: line.start_hour,
                end_hour: line.end_hour,
                room_id: line.room_id,
                course_assignment_id: line.course_assignment_id,
                session_type: line.session_type,
                note: line.note || undefined
            };
            const id = line.entry_ids[day];
            const current = id ? persistedById.get(id) : undefined;

            if (id && current && !kept.has(id)) {
                kept.add(id);
                if (hasChanged(current, payload)) {
                    plan.toUpdate.push({ line: index, day, id, payload });
                }
                continue;
            }
            plan.toCreate.push({ line: index, day, payload });
        }
    });

    plan.toDelete = persisted.filter((entry) => !kept.has(entry.id)).map((entry) => entry.id);
    return plan;
}

function hasChanged(entry: TimetableEntry, payload: TimetableEntryItemRequest): boolean {
    return (
        entry.date !== payload.date ||
        formatEntryTime(entry.start_hour) !== formatEntryTime(payload.start_hour) ||
        formatEntryTime(entry.end_hour) !== formatEntryTime(payload.end_hour) ||
        entry.room_id !== payload.room_id ||
        entry.course_assignment_id !== payload.course_assignment_id ||
        entry.session_type !== payload.session_type ||
        (entry.note || '') !== (payload.note || '')
    );
}
