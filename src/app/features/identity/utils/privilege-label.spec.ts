import { describePrivilege, groupPrivileges, privilegeLabel } from './privilege-label';

describe('privilege-label', () => {
    it('should describe resource, action and scope', () => {
        expect(describePrivilege('academic:student:read:faculty')).toEqual({
            name: 'academic:student:read:faculty',
            group: 'academic:student',
            groupLabel: 'Académique › Étudiants',
            action: 'read',
            actionLabel: 'Consulter',
            scope: 'faculty',
            scopeLabel: 'Faculté'
        });
    });

    it('should read the program and promotion scopes', () => {
        expect(privilegeLabel('scheduling:timetable:read:promotion')).toBe('Planification › Horaires — Consulter (Promotion)');
        expect(privilegeLabel('academic:course:read:program')).toBe('Académique › Cours — Consulter (Programme)');
    });

    it('should keep a privilege without scope or of unknown shape readable', () => {
        expect(privilegeLabel('identity:api:manage')).toBe('Identité › API — Gérer');
        expect(privilegeLabel('legacy')).toBe('legacy');
    });

    it('should group by resource, ordering actions then the widest scope first', () => {
        const groups = groupPrivileges([
            'identity:user:update:own',
            'identity:user:read:own',
            'academic:student:read:faculty',
            'identity:user:read:all',
            'identity:user:update:all'
        ]);

        expect(groups.map((group) => group.label)).toEqual(['Académique › Étudiants', 'Identité › Utilisateurs']);
        expect(groups[1].items.map((item) => `${item.action}:${item.scope}`)).toEqual(['read:all', 'read:own', 'update:all', 'update:own']);
    });
});
