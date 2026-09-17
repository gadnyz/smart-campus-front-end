import { normalizeProfessor, professorDisplayName } from './professor.model';
import { normalizeStudent, studentDisplayName } from './student.model';

describe('academic display names and normalization', () => {
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

    it('should flatten nested faculty and grade on a professor payload', () => {
        const professor = normalizeProfessor({
            id: 'p-1',
            first_name: 'Jean',
            last_name: 'Mbuyi',
            faculty: { id: 'fac-1', name: 'Sciences' },
            professor_grade: { id: 'g-1', name: 'Professeur', code: 'PROF' }
        });

        expect(professor.faculty_id).toBe('fac-1');
        expect(professor.faculty_name).toBe('Sciences');
        expect(professor.professor_grade_id).toBe('g-1');
        expect(professor.professor_grade_name).toBe('Professeur');
        expect(professor.professor_grade_code).toBe('PROF');
    });

    it('should flatten nested program and level on a student payload', () => {
        const student = normalizeStudent({
            id: 'st-1',
            first_name: 'Ada',
            last_name: 'Lovelace',
            program: { id: 'pr-1', name: 'Génie Logiciel', code: 'GL' },
            program_level: { level: { code: 'L1', name: 'Licence 1' } }
        });

        expect(student.program_name).toBe('Génie Logiciel');
        expect(student.program_code).toBe('GL');
        expect(student.level_code).toBe('L1');
        expect(student.level_name).toBe('Licence 1');
    });
});
