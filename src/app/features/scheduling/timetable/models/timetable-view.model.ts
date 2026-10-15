import { SessionType, isSessionType } from './timetable-entry.model';

/**
 * Une séance telle qu'affichée dans un calendrier, quelle que soit sa source : séances d'un
 * horaire (gestion), semaine d'un étudiant (`/timetables/me/week`) ou séances d'un professeur.
 */
export interface CalendarSession {
    id: string;
    date: string;
    start_hour: string;
    end_hour: string;
    course_code: string;
    course_name: string;
    professor_name: string;
    room_name: string;
    session_type: SessionType;
    note: string;
    /** Promotion concernée : utile au professeur, qui enseigne à plusieurs promotions. */
    promotion?: string;
}

/** `StudentTimetableEntryResponse` : séance de la semaine d'un étudiant, salle et enseignant résolus. */
export interface StudentTimetableEntry extends CalendarSession {
    timetable_id: string;
    course_id: string;
    professor_id: string;
    room_id: string;
    room_location: string;
    room_type: string;
    room_link: string;
}

export function asStudentTimetableEntry(raw: unknown): StudentTimetableEntry {
    const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    const sessionType = source['session_type'];
    const text = (key: string) => (typeof source[key] === 'string' ? (source[key] as string) : '');
    return {
        id: text('id'),
        timetable_id: text('timetable_id'),
        date: text('date'),
        start_hour: text('start_hour'),
        end_hour: text('end_hour'),
        session_type: isSessionType(sessionType) ? sessionType : 'LECTURE',
        course_id: text('course_id'),
        course_code: text('course_code'),
        course_name: text('course_name'),
        professor_id: text('professor_id'),
        professor_name: text('professor_name'),
        room_id: text('room_id'),
        room_name: text('room_name'),
        room_location: text('room_location'),
        room_type: text('room_type'),
        room_link: text('room_link'),
        note: text('note')
    };
}
