import {
    addDays,
    formatEntryTime,
    formatWeekStart,
    isEndAfterStart,
    mondayOf,
    parseApiDate,
    parseApiTime,
    rangesOverlap,
    toApiDate,
    toApiTime,
    weekBounds
} from './timetable-time';

describe('timetable-time', () => {
    it('should format dates with local getters, without UTC shift', () => {
        expect(toApiDate(new Date(2026, 9, 5, 23, 59))).toBe('2026-10-05');
        expect(toApiDate(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01');
    });

    it('should format times as HH:mm:00', () => {
        expect(toApiTime(new Date(2026, 9, 5, 8, 5, 42))).toBe('08:05:00');
    });

    it('should round-trip API dates and times', () => {
        expect(toApiDate(parseApiDate('2026-12-31'))).toBe('2026-12-31');
        expect(toApiTime(parseApiTime('14:30:00'))).toBe('14:30:00');
        expect(toApiTime(parseApiTime('07:15'))).toBe('07:15:00');
    });

    it('should compare times regardless of their precision', () => {
        expect(formatEntryTime('08:00:00')).toBe('08:00');
        expect(isEndAfterStart('08:00', '10:00:00')).toBeTrue();
        expect(isEndAfterStart('10:00:00', '10:00')).toBeFalse();
        expect(isEndAfterStart('10:00:00', '09:00:00')).toBeFalse();
    });

    it('should treat ranges as half-open', () => {
        expect(rangesOverlap('08:00:00', '10:00:00', '10:00:00', '12:00:00')).toBeFalse();
        expect(rangesOverlap('08:00:00', '10:00:00', '09:59:00', '12:00:00')).toBeTrue();
        expect(rangesOverlap('08:00:00', '12:00:00', '09:00:00', '10:00:00')).toBeTrue();
    });

    it('should find the Monday of the ISO week, Sunday included', () => {
        expect(toApiDate(mondayOf(new Date(2026, 9, 7)))).toBe('2026-10-05');
        expect(toApiDate(mondayOf(new Date(2026, 9, 11)))).toBe('2026-10-05');
        expect(toApiDate(mondayOf(new Date(2026, 9, 5)))).toBe('2026-10-05');
    });

    it('should compute week bounds across months and years', () => {
        expect(weekBounds(new Date(2026, 11, 31))).toEqual({ start: '2026-12-28', end: '2027-01-03' });
        expect(addDays('2026-02-27', 2)).toBe('2026-03-01');
    });

    it('should format a week start in French', () => {
        expect(formatWeekStart('2026-10-05')).toBe('5 octobre 2026');
        expect(formatWeekStart('')).toBe('');
    });
});
