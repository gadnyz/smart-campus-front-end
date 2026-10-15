import { EventInput } from '@fullcalendar/core';
import { TimetableEntry, sessionTypeLabel } from '../models/timetable-entry.model';
import { CalendarSession, StudentTimetableEntry } from '../models/timetable-view.model';
import { addDays, mondayOf, toApiDate } from './timetable-time';

/**
 * Séance d'un horaire (gestion, professeur) ou de la semaine d'un étudiant, vue par le calendrier.
 * `professorLabels` remplace « Prénom Nom » par « Grade Prénom Nom » quand l'enseignant y figure.
 */
export function toCalendarSession(entry: TimetableEntry | StudentTimetableEntry, professorLabels?: ReadonlyMap<string, string>): CalendarSession {
    return {
        id: entry.id,
        date: entry.date,
        start_hour: entry.start_hour,
        end_hour: entry.end_hour,
        course_code: entry.course_code,
        course_name: entry.course_name,
        professor_name: professorLabels?.get(entry.professor_id) ?? entry.professor_name,
        room_name: entry.room_name,
        session_type: entry.session_type,
        note: entry.note
    };
}

/**
 * Un événement FullCalendar par séance. Le titre ne porte que le cours ; la séance complète
 * (salle, professeur, promotion, note) reste dans `extendedProps.session` pour le détail.
 */
export function toCalendarEvent(session: CalendarSession): EventInput {
    return {
        id: session.id,
        title: session.course_name,
        start: `${session.date}T${session.start_hour}`,
        end: `${session.date}T${session.end_hour}`,
        classNames: [`timetable-session-${session.session_type.toLowerCase().replace('_', '-')}`],
        extendedProps: { session, typeLabel: sessionTypeLabel(session.session_type) }
    };
}

/**
 * Lundis des semaines couvertes par la plage affichée (fin exclue, comme FullCalendar). Un horaire
 * couvre une semaine : c'est la maille de chargement, quelle que soit la vue (jour, semaine, mois).
 */
export function weeksInRange(start: Date, end: Date): string[] {
    const weeks: string[] = [];
    const last = toApiDate(new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1));
    for (let monday = toApiDate(mondayOf(start)); monday <= last; monday = addDays(monday, 7)) {
        weeks.push(monday);
    }
    return weeks;
}
