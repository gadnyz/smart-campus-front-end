import { asList, refCode, refId, refName } from '../utils/academic-http';

describe('academic-http', () => {
    it('should unwrap arrays and paged payloads', () => {
        expect(asList([1, 2])).toEqual([1, 2]);
        expect(asList({ content: [3] })).toEqual([3]);
        expect(asList(null)).toEqual([]);
    });

    it('should read nested reference ids and names', () => {
        expect(refId('abc')).toBe('abc');
        expect(refId({ id: 'fac-1', name: 'Sciences' })).toBe('fac-1');
        expect(refName({ id: 'g-1', name: 'Professeur' })).toBe('Professeur');
        expect(refCode({ code: 'PROF' })).toBe('PROF');
        expect(refId(undefined)).toBeUndefined();
    });
});
