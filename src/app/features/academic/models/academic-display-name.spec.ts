import { normalizeProfessor, professorDisplayName } from './professor.model';
import { normalizeStudent, studentDisplayName, studentMatchesQuery } from './student.model';

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
        expect(studentDisplayName({ matricule: 'FST-001' })).toBe('FST-001');
        expect(studentDisplayName({ email: 'ada@unh.edu' })).toBe('ada@unh.edu');
        expect(studentDisplayName({ first_name: 'Ada', last_name: 'Lovelace' })).toBe('Lovelace Ada');
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

    it('should flatten nested program, level and faculty on a student payload', () => {
        const student = normalizeStudent({
            id: 'st-1',
            first_name: 'Ada',
            last_name: 'Lovelace',
            faculty: { id: 'fac-1', name: 'Sciences informatiques' },
            program: { id: 'pr-1', name: 'Génie Logiciel', code: 'GL' },
            program_level: { level: { id: 'lvl-1', code: 'L1', name: 'Licence 1' } }
        });

        expect(student.faculty_id).toBe('fac-1');
        expect(student.faculty_name).toBe('Sciences informatiques');
        expect(student.program_name).toBe('Génie Logiciel');
        expect(student.program_code).toBe('GL');
        expect(student.level_id).toBe('lvl-1');
        expect(student.level_code).toBe('L1');
        expect(student.level_name).toBe('Licence 1');
    });

    it('should match advanced student search filters', () => {
        const student = normalizeStudent({
            id: 'st-1',
            first_name: 'Ada',
            last_name: 'Lovelace',
            gender: 'MALE',
            nationality: 'Zambienne',
            faculty_id: 'fac-info',
            matricule: 'FST-001'
        });

        expect(
            studentMatchesQuery(student, { gender: 'MALE', facultyId: 'fac-info', nationality: 'congolaise' })
        ).toBeFalse();
        expect(
            studentMatchesQuery(student, { gender: 'MALE', facultyId: 'fac-info', nationality: 'zambienne' })
        ).toBeTrue();
        expect(studentMatchesQuery(student, { gender: 'FEMALE' })).toBeFalse();
        expect(studentMatchesQuery(student, { matricule: 'fst-001' })).toBeTrue();
    });
});
