import { TimetableEntry } from '../models/timetable-entry.model';
import { SessionLine } from '../models/timetable-session.model';
import { dateOfDay, dayOfWeek, findOverlappingLines, groupEntriesIntoLines, planSave } from './timetable-session';

const WEEK = '2026-10-05';

function entry(overrides: Partial<TimetableEntry>): TimetableEntry {
    return {
        id: 'entry',
        timetable_id: 'tt-1',
        date: WEEK,
        start_hour: '08:00:00',
        end_hour: '10:00:00',
        room_id: 'room-1',
        room_name: 'A101',
        course_assignment_id: 'ca-1',
        course_id: 'course-1',
        course_code: 'ALG',
        course_name: 'Algèbre',
        professor_id: 'prof-1',
        professor_name: 'Ada Lovelace',
        session_type: 'LECTURE',
        note: '',
        created_at: '',
        updated_at: '',
        ...overrides
    };
}

function line(overrides: Partial<SessionLine>): SessionLine {
    return {
        course_id: 'course-1',
        course_assignment_id: 'ca-1',
        start_hour: '08:00:00',
        end_hour: '10:00:00',
        days: [1],
        room_id: 'room-1',
        session_type: 'LECTURE',
        note: '',
        entry_ids: {},
        ...overrides
    };
}

describe('timetable-session', () => {
    describe('dateOfDay / dayOfWeek', () => {
        it('should map ISO days to the dates of the week and back', () => {
            expect(dateOfDay(WEEK, 1)).toBe('2026-10-05');
            expect(dateOfDay(WEEK, 7)).toBe('2026-10-11');
            expect(dayOfWeek(WEEK, '2026-10-07')).toBe(3);
        });

        it('should return null for a date outside the week', () => {
            expect(dayOfWeek(WEEK, '2026-10-04')).toBeNull();
            expect(dayOfWeek(WEEK, '2026-10-12')).toBeNull();
        });
    });

    describe('groupEntriesIntoLines', () => {
        it('should merge identical sessions of several days into one line', () => {
            const lines = groupEntriesIntoLines(
                [
                    entry({ id: 'e-wed', date: '2026-10-07' }),
                    entry({ id: 'e-mon', date: '2026-10-05', start_hour: '08:00' }),
                    entry({ id: 'e-other', date: '2026-10-05', start_hour: '10:00:00', end_hour: '12:00:00' })
                ],
                WEEK
            );

            expect(lines.length).toBe(2);
            expect(lines[0].days).toEqual([1, 3]);
            expect(lines[0].entry_ids).toEqual({ 1: 'e-mon', 3: 'e-wed' });
            expect(lines[1].entry_ids).toEqual({ 1: 'e-other' });
        });

        it('should keep sessions that differ by room, type, assignment or note apart', () => {
            const lines = groupEntriesIntoLines(
                [
                    entry({ id: 'a', date: '2026-10-05' }),
                    entry({ id: 'b', date: '2026-10-06', room_id: 'room-2' }),
                    entry({ id: 'c', date: '2026-10-07', session_type: 'EXAM' }),
                    entry({ id: 'd', date: '2026-10-08', course_assignment_id: 'ca-2' }),
                    entry({ id: 'e', date: '2026-10-09', note: 'Rattrapage' })
                ],
                WEEK
            );
            expect(lines.length).toBe(5);
        });

        it('should ignore sessions outside the week', () => {
            expect(groupEntriesIntoLines([entry({ date: '2026-10-12' })], WEEK)).toEqual([]);
        });
    });

    describe('findOverlappingLines', () => {
        it('should flag lines sharing a day and an overlapping time range', () => {
            const conflicts = findOverlappingLines([
                line({ days: [1, 3], start_hour: '08:00:00', end_hour: '10:00:00' }),
                line({ days: [3], start_hour: '09:00:00', end_hour: '11:00:00' }),
                line({ days: [1], start_hour: '10:00:00', end_hour: '12:00:00' })
            ]);

            expect(conflicts.get(0)).toEqual([1]);
            expect(conflicts.get(1)).toEqual([0]);
            expect(conflicts.has(2)).toBeFalse();
        });

        it('should ignore lines on different days', () => {
            expect(findOverlappingLines([line({ days: [1] }), line({ days: [2] })]).size).toBe(0);
        });
    });

    describe('planSave', () => {
        it('should create one session per selected day', () => {
            const plan = planSave([line({ days: [3, 1] })], WEEK, []);

            expect(plan.toDelete).toEqual([]);
            expect(plan.toUpdate).toEqual([]);
            expect(plan.toCreate.map((item) => [item.line, item.day, item.payload.date])).toEqual([
                [0, 1, '2026-10-05'],
                [0, 3, '2026-10-07']
            ]);
            expect(plan.toCreate[0].payload.note).toBeUndefined();
        });

        it('should leave unchanged sessions alone', () => {
            const persisted = [entry({ id: 'e-mon', date: '2026-10-05', start_hour: '08:00' })];
            const plan = planSave([line({ days: [1], entry_ids: { 1: 'e-mon' } })], WEEK, persisted);

            expect(plan).toEqual({ toDelete: [], toUpdate: [], toCreate: [] });
        });

        it('should update changed sessions, delete removed days and create added ones', () => {
            const persisted = [entry({ id: 'e-mon', date: '2026-10-05' }), entry({ id: 'e-tue', date: '2026-10-06' })];
            const plan = planSave(
                [line({ days: [1, 5], start_hour: '09:00:00', end_hour: '11:00:00', entry_ids: { 1: 'e-mon', 2: 'e-tue' } })],
                WEEK,
                persisted
            );

            expect(plan.toDelete).toEqual(['e-tue']);
            expect(plan.toUpdate.map((item) => [item.id, item.payload.start_hour])).toEqual([['e-mon', '09:00:00']]);
            expect(plan.toCreate.map((item) => item.payload.date)).toEqual(['2026-10-09']);
        });

        it('should delete sessions of removed lines', () => {
            const plan = planSave([], WEEK, [entry({ id: 'gone' })]);
            expect(plan.toDelete).toEqual(['gone']);
        });

        it('should recreate a session whose id is no longer persisted', () => {
            const plan = planSave([line({ days: [1], entry_ids: { 1: 'stale' } })], WEEK, []);
            expect(plan.toCreate.length).toBe(1);
        });
    });
});
