import { professorDisplayName } from './professor.model';
import { studentDisplayName } from './student.model';

describe('academic display names', () => {
    it('should format a professor full name', () => {
        expect(
            professorDisplayName({
                first_name: 'Jean',
                last_name: 'Mbuyi',
                middle_name: 'Kabongo'
            })
        ).toBe('Mbuyi Jean Kabongo');
    });

    it('should fall back to matricule then email for a student', () => {
        expect(studentDisplayName({ id: 'st-1', matricule: 'FST-001' })).toBe('FST-001');
        expect(studentDisplayName({ id: 'st-1', email: 'ada@unh.edu' })).toBe('ada@unh.edu');
        expect(studentDisplayName({ id: 'st-1', first_name: 'Ada', last_name: 'Lovelace' })).toBe('Lovelace Ada');
    });
});
