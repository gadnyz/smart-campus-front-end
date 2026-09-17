import { toApiDate, toDateValue } from './academic-date';

describe('academic-date', () => {
    it('should format a Date as yyyy-MM-dd', () => {
        expect(toApiDate(new Date(1980, 4, 15))).toBe('1980-05-15');
    });

    it('should keep an ISO date string', () => {
        expect(toApiDate('1980-05-15T00:00:00.000Z')).toBe('1980-05-15');
    });

    it('should parse a date string', () => {
        expect(toDateValue('1980-05-15')?.getFullYear()).toBe(1980);
        expect(toDateValue(undefined)).toBeNull();
    });
});
