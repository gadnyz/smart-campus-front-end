export const SESSION_TYPES = ['LECTURE', 'PRACTICAL_WORK', 'EXAM', 'TEST'] as const;
export type SessionType = (typeof SESSION_TYPES)[number];

export interface TimetableEntry {
    id: string;
    timetable_id: string;
    date: string;
    start_hour: string;
    end_hour: string;
    room_id: string;
    room_name: string;
    course_assignment_id: string;
    course_id: string;
    course_code: string;
    course_name: string;
    professor_id: string;
    professor_name: string;
    session_type: SessionType;
    note: string;
    created_at: string;
    updated_at: string;
}

export interface TimetableEntryItemRequest {
    date: string;
    start_hour: string;
    end_hour: string;
    room_id: string;
    course_assignment_id: string;
    session_type: SessionType;
    note?: string;
}

export interface CreateTimetableEntryRequest {
    timetable_id: string;
    entries: TimetableEntryItemRequest[];
}

export interface UpdateTimetableEntryRequest {
    date: string;
    start_hour: string;
    end_hour: string;
    room_id: string;
    course_assignment_id: string;
    session_type: SessionType;
    note?: string;
}

export const SESSION_TYPE_OPTIONS: { label: string; value: SessionType }[] = [
    { label: 'Cours', value: 'LECTURE' },
    { label: 'Travaux pratiques', value: 'PRACTICAL_WORK' },
    { label: 'Examen', value: 'EXAM' },
    { label: 'Test', value: 'TEST' }
];

export function sessionTypeLabel(type: SessionType | string): string {
    return SESSION_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

export function asTimetableEntry(raw: unknown): TimetableEntry {
    const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    const sessionType = source['session_type'];
    return {
        id: text(source, 'id'),
        timetable_id: text(source, 'timetable_id'),
        date: text(source, 'date'),
        start_hour: text(source, 'start_hour'),
        end_hour: text(source, 'end_hour'),
        room_id: text(source, 'room_id'),
        room_name: text(source, 'room_name'),
        course_assignment_id: text(source, 'course_assignment_id'),
        course_id: text(source, 'course_id'),
        course_code: text(source, 'course_code'),
        course_name: text(source, 'course_name'),
        professor_id: text(source, 'professor_id'),
        professor_name: text(source, 'professor_name'),
        session_type: isSessionType(sessionType) ? sessionType : 'LECTURE',
        note: text(source, 'note'),
        created_at: text(source, 'created_at'),
        updated_at: text(source, 'updated_at')
    };
}

export function isSessionType(value: unknown): value is SessionType {
    return typeof value === 'string' && (SESSION_TYPES as readonly string[]).includes(value);
}

function text(source: Record<string, unknown>, key: string): string {
    const value = source[key];
    return typeof value === 'string' ? value : '';
}