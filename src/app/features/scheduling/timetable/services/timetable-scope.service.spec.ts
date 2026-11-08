import { TestBed } from '@angular/core/testing';
import { AuthService } from '@/app/core/auth/services/auth.service';
import { TimetableScopeService, scopeQuery } from './timetable-scope.service';

describe('TimetableScopeService', () => {
    function scopeFor(authorities: string[], facultyId: string | null = null, profiles: string[] = []): TimetableScopeService {
        TestBed.configureTestingModule({
            providers: [{ provide: AuthService, useValue: { getCurrentUser: () => ({ id: 'u', profiles, authorities, faculty_id: facultyId }) } }]
        });
        return TestBed.inject(TimetableScopeService);
    }

    it('should let a user with the all scope see every faculty', () => {
        const scope = scopeFor(['scheduling:timetable:read:all'], 'fac-1');
        expect(scope.facultyId()).toBeNull();
        expect(scope.facultyMissing()).toBeFalse();
    });

    it('should limit a faculty scope to the faculty of the account', () => {
        expect(scopeFor(['scheduling:timetable:read:faculty'], 'fac-1').facultyId()).toBe('fac-1');
    });

    it('should flag a faculty scope without faculty', () => {
        const scope = scopeFor(['scheduling:timetable:read:faculty']);
        expect(scope.facultyId()).toBeNull();
        expect(scope.facultyMissing()).toBeTrue();
    });

    it('should keep the widest scope when both are held', () => {
        expect(scopeFor(['scheduling:timetable:read:faculty', 'scheduling:timetable:read:all'], 'fac-1').facultyId()).toBeNull();
    });

    it('should pick the personal timetable, professor first', () => {
        expect(scopeFor([], null, ['STUDENT']).personalKind()).toBe('student');
        TestBed.resetTestingModule();
        expect(scopeFor([], null, ['STUDENT', 'PROFESSOR']).personalKind()).toBe('professor');
        TestBed.resetTestingModule();
        expect(scopeFor([], null, ['ADMIN']).personalKind()).toBeNull();
    });

    it('should only add a faculty filter when there is one', () => {
        expect(scopeQuery('fac-1')).toEqual({ facultyId: 'fac-1' });
        expect(scopeQuery(null)).toEqual({});
    });
});
