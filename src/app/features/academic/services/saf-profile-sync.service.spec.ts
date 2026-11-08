import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { User } from '@/app/features/identity/users/models/user.model';
import { UsersService } from '@/app/features/identity/users/services/user.service';
import { FacultyService } from './faculty.service';
import { SafProfileSyncService } from './saf-profile-sync.service';

describe('SafProfileSyncService', () => {
    let service: SafProfileSyncService;
    let users: jasmine.SpyObj<UsersService>;
    let faculties: jasmine.SpyObj<FacultyService>;

    const user = (profiles: string[], facultyId = 'fac-1') => ({ id: 'u-1', username: 'saf', email: 'saf@unh.edu', profiles, faculty_id: facultyId }) as unknown as User;

    beforeEach(() => {
        users = jasmine.createSpyObj<UsersService>('UsersService', ['getUserById', 'getProfiles', 'assignProfile', 'removeProfile', 'updateUser']);
        faculties = jasmine.createSpyObj<FacultyService>('FacultyService', ['getAll', 'getLeadership']);
        users.getProfiles.and.returnValue(
            of({ content: [{ id: 'p-prof', name: 'PROFESSOR' }, { id: 'p-saf', name: 'ACADEMIC_SECRETARY' }], page: 0, size: 100, total_elements: 2, total_pages: 1 }) as Observable<never>
        );
        users.assignProfile.and.returnValue(of(undefined));
        users.removeProfile.and.returnValue(of(undefined));
        users.updateUser.and.returnValue(of(user([])));
        faculties.getAll.and.returnValue(of([{ id: 'fac-1' }, { id: 'fac-2' }] as unknown) as Observable<never>);
        faculties.getLeadership.and.returnValue(of([]));

        TestBed.configureTestingModule({ providers: [{ provide: UsersService, useValue: users }, { provide: FacultyService, useValue: faculties }] });
        service = TestBed.inject(SafProfileSyncService);
    });

    it('attribue le profil et rattache le compte à la faculté de la nomination', () => {
        users.getUserById.and.returnValue(of(user(['PROFESSOR'], 'fac-2')));
        let result = {};
        service.afterAssign('u-1', 'fac-1').subscribe((sync) => (result = sync));

        expect(users.assignProfile).toHaveBeenCalledWith('u-1', 'p-saf');
        expect(users.updateUser).toHaveBeenCalledWith('u-1', { username: 'saf', email: 'saf@unh.edu', faculty_id: 'fac-1' });
        expect(result).toEqual({ profileAdded: true, facultyAligned: true });
    });

    it('ne change rien à un compte déjà SAF de cette faculté', () => {
        users.getUserById.and.returnValue(of(user(['ACADEMIC_SECRETARY'])));
        let result = {};
        service.afterAssign('u-1', 'fac-1').subscribe((sync) => (result = sync));

        expect(users.assignProfile).not.toHaveBeenCalled();
        expect(users.updateUser).not.toHaveBeenCalled();
        expect(result).toEqual({});
    });

    it('signale un refus du serveur sans annuler la nomination', () => {
        users.getUserById.and.returnValue(of(user(['PROFESSOR'])));
        users.assignProfile.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403, error: { detail: 'Accès refusé' } })));
        let result = {};
        service.afterAssign('u-1', 'fac-1').subscribe((sync) => (result = sync));
        expect(result).toEqual({ failure: 'Accès refusé' });
    });

    it('retire le profil à la révocation', () => {
        users.getUserById.and.returnValue(of(user(['PROFESSOR', 'ACADEMIC_SECRETARY'])));
        let result = {};
        service.afterRevoke('u-1', 'fac-1').subscribe((sync) => (result = sync));

        expect(faculties.getLeadership).toHaveBeenCalledOnceWith('fac-2');
        expect(users.removeProfile).toHaveBeenCalledWith('u-1', 'p-saf');
        expect(result).toEqual({ profileRemoved: true });
    });

    it('garde le profil s’il reste SAF d’une autre faculté', () => {
        users.getUserById.and.returnValue(of(user(['ACADEMIC_SECRETARY'])));
        faculties.getLeadership.and.returnValue(of([{ id: 'a-2', user_id: 'u-1', role: 'SAF', active: true }] as unknown) as Observable<never>);
        service.afterRevoke('u-1', 'fac-1').subscribe();
        expect(users.removeProfile).not.toHaveBeenCalled();
    });
});
