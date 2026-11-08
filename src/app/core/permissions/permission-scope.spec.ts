import { PERMISSION_SCOPE_LABELS, manageAuthorities, parseAuthority, scopedAuthority, widestScope, writeAuthorities } from './permission-scope';

describe('permission-scope', () => {
    it('should split an authority into permission and scope', () => {
        expect(parseAuthority('academic:student:read:faculty')).toEqual({ permission: 'academic:student:read', scope: 'faculty' });
        expect(parseAuthority('scheduling:timetable:read:promotion')).toEqual({ permission: 'scheduling:timetable:read', scope: 'promotion' });
        expect(parseAuthority('academic:program:read:program')).toEqual({ permission: 'academic:program:read', scope: 'program' });
    });

    it('should leave an authority without a known scope untouched', () => {
        expect(parseAuthority('identity:api:manage')).toEqual({ permission: 'identity:api:manage', scope: null });
        expect(parseAuthority('nocolon')).toEqual({ permission: 'nocolon', scope: null });
    });

    it('should build a scoped authority', () => {
        expect(scopedAuthority('academic:student:read', 'promotion')).toBe('academic:student:read:promotion');
    });

    it('should pick the widest scope, all winning over unit levels', () => {
        const authorities = ['a:b:read:own', 'a:b:read:promotion', 'a:b:read:faculty', 'a:b:read:program'];
        expect(widestScope(authorities, 'a:b:read')).toBe('faculty');
        expect(widestScope([...authorities, 'a:b:read:all'], 'a:b:read')).toBe('all');
        expect(widestScope(authorities, 'a:b:update')).toBeNull();
        expect(widestScope(['identity:api:manage'], 'identity:api:manage')).toBe('all');
    });

    it('should label every scope in French', () => {
        expect(Object.values(PERMISSION_SCOPE_LABELS)).toEqual(['Personnel', 'Promotion', 'Programme', 'Faculté', 'Tous']);
    });

    it('should list the write authorities beyond oneself, own excluded', () => {
        expect(writeAuthorities('academic:student:update')).toEqual([
            'academic:student:update:promotion',
            'academic:student:update:program',
            'academic:student:update:faculty',
            'academic:student:update:all'
        ]);
    });

    it('should open a management screen to any write, or to reading one’s faculty or everything', () => {
        const keys = manageAuthorities('admission:candidate');
        expect(keys).toContain('admission:candidate:create:faculty');
        expect(keys).toContain('admission:candidate:delete:all');
        expect(keys).toContain('admission:candidate:read:all');
        expect(keys).not.toContain('admission:candidate:update:own');
        expect(keys).toContain('admission:candidate:read:faculty');
        expect(keys).not.toContain('admission:candidate:read:promotion');
        expect(keys).not.toContain('admission:candidate:read:own');
        expect(keys.length).toBe(14);
    });
});
