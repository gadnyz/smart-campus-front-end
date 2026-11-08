import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { FacultyScopeService } from './faculty-scope.service';

describe('FacultyScopeService', () => {
    function serviceFor(authorities: string[], facultyId: string | null = 'fac-1'): FacultyScopeService {
        TestBed.configureTestingModule({
            providers: [{ provide: AuthService, useValue: { getCurrentUser: () => ({ id: 'u', authorities, faculty_id: facultyId }) } }]
        });
        return TestBed.inject(FacultyScopeService);
    }

    beforeEach(() => sessionStorage.removeItem('smartcampus.working-faculty'));
    afterEach(() => sessionStorage.removeItem('smartcampus.working-faculty'));

    it('impose la faculté du compte à une portée plus étroite que all', () => {
        const scope = serviceFor(['academic:course:read:faculty']);
        expect(scope.isScopedFor('academic:course:read')).toBeTrue();
        expect(scope.scopedIdFor('academic:course:read')).toBe('fac-1');
        expect(scope.initialFacultyId('academic:course:read')).toBe('fac-1');
    });

    it('laisse la portée all choisir sa faculté, et la garde pour la session', () => {
        const scope = serviceFor(['academic:course:read:all', 'academic:course:read:faculty']);
        expect(scope.isScopedFor('academic:course:read')).toBeFalse();
        expect(scope.initialFacultyId('academic:course:read')).toBeNull();

        scope.rememberFaculty('fac-2');
        expect(scope.initialFacultyId('academic:course:read')).toBe('fac-2');
        expect(sessionStorage.getItem('smartcampus.working-faculty')).toBe('fac-2');

        scope.rememberFaculty(null);
        expect(sessionStorage.getItem('smartcampus.working-faculty')).toBeNull();
    });

    it('ne limite pas qui n’a pas la ressource', () => {
        expect(serviceFor([]).isScopedFor('academic:course:read')).toBeFalse();
    });
});
