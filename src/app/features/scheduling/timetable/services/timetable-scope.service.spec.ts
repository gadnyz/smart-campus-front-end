import { TestBed } from '@angular/core/testing';
import { AuthService } from '@/app/core/auth/services/auth.service';
import { TimetableScopeService, scopeQuery } from './timetable-scope.service';

describe('TimetableScopeService', () => {
    function scopeFor(profiles: string[], facultyId: string | null = null): TimetableScopeService {
        TestBed.configureTestingModule({
            providers: [{ provide: AuthService, useValue: { getCurrentUser: () => ({ id: 'u', profiles, faculty_id: facultyId }) } }]
        });
        return TestBed.inject(TimetableScopeService);
    }

    it('should let a scheduling admin see every faculty', () => {
        const scope = scopeFor(['ADMIN'], 'fac-1');
        expect(scope.facultyId()).toBeNull();
        expect(scope.facultyMissing()).toBeFalse();
    });

    it('should limit an academic secretary to their faculty', () => {
        expect(scopeFor(['ACADEMIC_SECRETARY'], 'fac-1').facultyId()).toBe('fac-1');
    });

    it('should flag an academic secretary without faculty', () => {
        const scope = scopeFor(['ACADEMIC_SECRETARY']);
        expect(scope.facultyId()).toBeNull();
        expect(scope.facultyMissing()).toBeTrue();
    });

    it('should not restrict an admin who is also an academic secretary', () => {
        expect(scopeFor(['ADMIN', 'ACADEMIC_SECRETARY'], 'fac-1').facultyId()).toBeNull();
    });

    it('should pick the personal timetable, professor first', () => {
        expect(scopeFor(['STUDENT']).personalKind()).toBe('student');
        TestBed.resetTestingModule();
        expect(scopeFor(['STUDENT', 'PROFESSOR']).personalKind()).toBe('professor');
        TestBed.resetTestingModule();
        expect(scopeFor(['ADMIN']).personalKind()).toBeNull();
    });

    it('should only add a faculty filter when there is one', () => {
        expect(scopeQuery('fac-1')).toEqual({ facultyId: 'fac-1' });
        expect(scopeQuery(null)).toEqual({});
    });
});
