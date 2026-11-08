import { toApiParams } from './api-params';

describe('toApiParams', () => {
    it('should keep snake_case keys and omit empty values', () => {
        const params = toApiParams({ program_level_id: 'pl-1', faculty_id: undefined, search: '  ', status: null, page: 0, size: 20 });

        expect(params.keys()).toEqual(['program_level_id', 'page', 'size']);
        expect(params.get('page')).toBe('0');
    });

    it('should trim strings', () => {
        expect(toApiParams({ search: '  Mbuyi ' }).get('search')).toBe('Mbuyi');
    });

    it('should repeat the key for an array', () => {
        expect(toApiParams({ sort: ['last_name,asc', 'first_name,asc'] }).getAll('sort')).toEqual(['last_name,asc', 'first_name,asc']);
    });

    it('should refuse a camelCase key, silently ignored by the API', () => {
        expect(() => toApiParams({ programLevelId: 'pl-1' })).toThrowError(/snake_case/);
        expect(() => toApiParams({ referenceDate: '2026-10-19' })).toThrowError(/snake_case/);
    });
});
