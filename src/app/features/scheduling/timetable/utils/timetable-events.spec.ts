import { CalendarSession } from '../models/timetable-view.model';
import { toCalendarEvent, toCalendarSession, weeksInRange } from './timetable-events';

const session: CalendarSession = {
    id: 'e-1',
    date: '2026-10-07',
    start_hour: '08:00:00',
    end_hour: '10:00:00',
    course_code: 'ALG',
    course_name: 'Algèbre',
    professor_name: 'Ada Lovelace',
    room_name: 'A101',
    session_type: 'PRACTICAL_WORK',
    note: ''
};

describe('timetable-events', () => {
    it('should title an event with the course only, and keep the full session for the details', () => {
        const event = toCalendarEvent({ ...session, promotion: 'Informatique · Licence 1' });

        expect(event.title).toBe('Algèbre');
        expect(event.start).toBe('2026-10-07T08:00:00');
        expect(event.end).toBe('2026-10-07T10:00:00');
        expect(event.classNames).toEqual(['timetable-session-practical-work']);
        const kept = (event.extendedProps as { session: CalendarSession }).session;
        expect([kept.id, kept.room_name, kept.professor_name, kept.promotion]).toEqual(['e-1', 'A101', 'Ada Lovelace', 'Informatique · Licence 1']);
    });

    it('should show the professor with their grade when known, the session name otherwise', () => {
        const entry = { ...session, timetable_id: 'tt-1', professor_id: 'prof-1' } as unknown as Parameters<typeof toCalendarSession>[0];
        expect(toCalendarSession(entry, new Map([['prof-1', 'PO Ada Lovelace']])).professor_name).toBe('PO Ada Lovelace');
        expect(toCalendarSession(entry, new Map()).professor_name).toBe('Ada Lovelace');
        expect(toCalendarSession(entry).professor_name).toBe('Ada Lovelace');
    });

    it('should list the Mondays of the displayed range, end excluded', () => {
        expect(weeksInRange(new Date(2026, 9, 5), new Date(2026, 9, 12))).toEqual(['2026-10-05']);
        expect(weeksInRange(new Date(2026, 9, 7), new Date(2026, 9, 8))).toEqual(['2026-10-05']);
        // Vue mois d'octobre 2026 : du lundi 28 septembre au lundi 9 novembre exclu.
        expect(weeksInRange(new Date(2026, 8, 28), new Date(2026, 10, 9))).toEqual([
            '2026-09-28',
            '2026-10-05',
            '2026-10-12',
            '2026-10-19',
            '2026-10-26',
            '2026-11-02'
        ]);
    });
});
