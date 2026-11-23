import { durationLabel, parseTimeText, slotOptions } from './time-slots';

describe('time slots', () => {
    it('should offer the half hours from 8:00 to 20:00', () => {
        const options = slotOptions();
        expect(options.length).toBe(25);
        expect(options[0]).toEqual({ value: '08:00' });
        expect(options.at(-1)?.value).toBe('20:00');
    });

    it('should offer only the slots after the start for the end, with the duration', () => {
        const options = slotOptions(8 * 60);
        expect(options[0]).toEqual({ value: '08:30', hint: '30 min' });
        expect(options.find((option) => option.value === '10:00')?.hint).toBe('2 h');
    });

    it('should read the usual ways of typing an hour', () => {
        expect(parseTimeText('8')).toBe(480);
        expect(parseTimeText('8h')).toBe(480);
        expect(parseTimeText('8h30')).toBe(510);
        expect(parseTimeText('08:45')).toBe(525);
        expect(parseTimeText('1015')).toBe(615);
        expect(parseTimeText('930')).toBe(570);
        expect(parseTimeText('8.3')).toBe(510);
    });

    it('should refuse what is not an hour', () => {
        expect(parseTimeText('')).toBeNull();
        expect(parseTimeText('25h')).toBeNull();
        expect(parseTimeText('8h75')).toBeNull();
        expect(parseTimeText('midi')).toBeNull();
    });

    it('should write durations the way people say them', () => {
        expect(durationLabel(30)).toBe('30 min');
        expect(durationLabel(90)).toBe('1 h 30');
        expect(durationLabel(120)).toBe('2 h');
    });
});
