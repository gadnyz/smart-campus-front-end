import { profileLabel } from './profile-label';

describe('profileLabel', () => {
    it('should translate the known profile codes', () => {
        expect(profileLabel('ACADEMIC_SECRETARY')).toBe('Secrétaire académique');
        expect(profileLabel('PROFESSOR')).toBe('Professeur');
        expect(profileLabel('student')).toBe('Étudiant');
    });

    it('should make an unknown code readable, and leave an empty value empty', () => {
        expect(profileLabel('ADMIN_SCHEDULING')).toBe('Admin scheduling');
        expect(profileLabel(null)).toBe('');
    });
});
