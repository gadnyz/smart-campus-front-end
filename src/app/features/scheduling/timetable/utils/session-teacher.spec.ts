import { CourseAssignment } from '@/app/features/academic/academic.public-api';
import { pickSessionAssignment } from './session-teacher';

const assignment = (id: string, overrides: Partial<CourseAssignment> = {}): CourseAssignment => ({
    id,
    course_id: 'course-1',
    professor_id: `prof-${id}`,
    academic_year_id: 'year-1',
    assignment_type: 'LEAD_INSTRUCTOR',
    status: 'ACTIVE',
    created_at: '2026-11-01T10:00:00Z',
    ...overrides
});

describe('pickSessionAssignment', () => {
    it('should take the lead instructor before any assistant', () => {
        const assistant = assignment('co', { assignment_type: 'CO_INSTRUCTOR', created_at: '2026-10-01T10:00:00Z' });
        expect(pickSessionAssignment([assistant, assignment('lead')])?.id).toBe('lead');
    });

    it('should take the first assistant added when there is no lead instructor', () => {
        const later = assignment('co-2', { assignment_type: 'CO_INSTRUCTOR', created_at: '2026-11-05T10:00:00Z' });
        const first = assignment('co-1', { assignment_type: 'CO_INSTRUCTOR', created_at: '2026-11-02T10:00:00Z' });
        expect(pickSessionAssignment([later, first])?.id).toBe('co-1');
    });

    it('should ignore inactive assignments', () => {
        expect(pickSessionAssignment([assignment('off', { status: 'INACTIVE' })])).toBeNull();
        expect(pickSessionAssignment([])).toBeNull();
    });
});
