import { Program } from '@/app/features/academic/academic.public-api';
import { Timetable } from '../models/timetable.model';
import { CalendarSession } from '../models/timetable-view.model';
import { PrintDay, PrintGrid, PrintRow, PrintSession, PrintableTimetable } from '../models/timetable-print.model';
import { addDays, formatEntryTime, parseApiDate } from './timetable-time';

/** Écart minimal entre deux créneaux pour tracer la ligne de pause grise. */
const BREAK_MINUTES = 60;

const WEEKDAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

/** « 08:00:00 » → « 8h00 », comme sur la grille papier. */
export function printTime(value: string): string {
    const [hours, minutes] = formatEntryTime(value).split(':');
    return `${Number(hours)}h${minutes}`;
}

function minutes(value: string): number {
    const [hours, mins] = formatEntryTime(value).split(':').map(Number);
    return hours * 60 + mins;
}

/** Numéro de semaine ISO 8601 (la semaine du premier jeudi de janvier est la semaine 1). */
export function isoWeek(date: string): number {
    const [year, month, day] = date.split('-').map(Number);
    // En UTC pour ne pas dépendre des changements d'heure.
    const value = new Date(Date.UTC(year, month - 1, day));
    const weekday = value.getUTCDay() || 7;
    value.setUTCDate(value.getUTCDate() + 4 - weekday); // jeudi de la même semaine
    const yearStart = Date.UTC(value.getUTCFullYear(), 0, 1);
    return Math.ceil(((value.getTime() - yearStart) / 86_400_000 + 1) / 7);
}

function dayLabel(date: string): string {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(parseApiDate(date));
}

/** « Du 12 au 18 octobre 2026 », « Du 28 septembre au 4 octobre 2026 ». */
export function weekPeriod(weekStart: string): string {
    const start = parseApiDate(weekStart);
    const end = parseApiDate(addDays(weekStart, 6));
    const year = new Intl.DateTimeFormat('fr-FR', { year: 'numeric' });
    const startLabel =
        start.getMonth() === end.getMonth()
            ? String(start.getDate())
            : new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', ...(start.getFullYear() !== end.getFullYear() ? { year: 'numeric' } : {}) }).format(start);
    return `Du ${startLabel} au ${dayLabel(addDays(weekStart, 6))} ${year.format(end)}`;
}

/**
 * Grille hebdomadaire du modèle « Horaire Faculté » : une colonne par jour (lundi à samedi, et le
 * dimanche s'il porte une séance), une ligne par créneau distinct, une ligne de pause quand deux
 * créneaux successifs sont séparés d'au moins une heure.
 */
export function buildPrintGrid(timetable: PrintableTimetable): PrintGrid {
    const { weekStart, sessions } = timetable;
    const inWeek = sessions.filter((session) => session.date >= weekStart && session.date <= addDays(weekStart, 6));
    const withSunday = inWeek.some((session) => session.date === addDays(weekStart, 6));

    const days: PrintDay[] = WEEKDAYS.slice(0, withSunday ? 7 : 6).map((weekday, index) => {
        const date = addDays(weekStart, index);
        return { date, weekday, label: dayLabel(date) };
    });

    const slots = new Map<string, { start: string; end: string }>();
    for (const session of inWeek) {
        const start = formatEntryTime(session.start_hour);
        const end = formatEntryTime(session.end_hour);
        slots.set(`${start}-${end}`, { start, end });
    }
    const ordered = [...slots.values()].sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));

    const rows: PrintRow[] = [];
    ordered.forEach((slot, index) => {
        const previous = ordered[index - 1];
        if (previous && minutes(slot.start) - minutes(previous.end) >= BREAK_MINUTES) {
            rows.push({ kind: 'break' });
        }
        rows.push({
            kind: 'slot',
            label: `${printTime(slot.start)} - ${printTime(slot.end)}`,
            start: slot.start,
            end: slot.end,
            cells: days.map((day) =>
                inWeek
                    .filter((session) => session.date === day.date && formatEntryTime(session.start_hour) === slot.start && formatEntryTime(session.end_hour) === slot.end)
                    .sort((a, b) => a.course.localeCompare(b.course))
            )
        });
    });

    return { weekLabel: `Semaine ${isoWeek(weekStart)}`, period: weekPeriod(weekStart), days, rows };
}

/** Séance du calendrier → séance imprimée (le nom d'enseignant y est déjà gradé). */
export function toPrintSession(session: CalendarSession): PrintSession {
    return {
        date: session.date,
        start_hour: session.start_hour,
        end_hour: session.end_hour,
        course: session.course_name,
        professor: session.professor_name,
        room: session.room_name,
        session_type: session.session_type,
        ...(session.promotion ? { promotion: session.promotion } : {})
    };
}

/**
 * Semaine imprimable d'un horaire de promotion : intitulé = faculté, titre de niveau 2 = code du
 * niveau et programme (« L1 — Science Informatique »). Le code vient du catalogue des programmes ;
 * à défaut, le nom du niveau porté par l'horaire.
 */
export function printableFromTimetable(
    timetable: Pick<Timetable, 'faculty_name' | 'program_id' | 'program_name' | 'program_level_id' | 'program_level_name' | 'week_start'>,
    sessions: readonly CalendarSession[],
    programs: readonly Program[]
): PrintableTimetable {
    const level = programs.find((program) => program.id === timetable.program_id)?.levels?.find((item) => item.id === timetable.program_level_id)?.level;
    return {
        title: timetable.faculty_name,
        heading: `${level?.code || timetable.program_level_name} — ${timetable.program_name}`,
        weekStart: timetable.week_start,
        sessions: sessions.map(toPrintSession)
    };
}

/** Nom de fichier lisible et sûr : « horaire-l1-science-informatique-2026-10-12 ». */
export function exportFileName(timetables: readonly PrintableTimetable[]): string {
    const slug = (value: string) =>
        value
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    const weeks = [...new Set(timetables.map((timetable) => timetable.weekStart))].sort();
    const period = weeks.length > 1 ? `${weeks[0]}-au-${weeks[weeks.length - 1]}` : (weeks[0] ?? '');
    return ['horaire', slug(timetables[0]?.heading ?? ''), period].filter(Boolean).join('-');
}
