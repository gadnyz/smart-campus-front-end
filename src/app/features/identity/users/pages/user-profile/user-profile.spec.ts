import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/services/auth.service';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { IdentityPermission } from '../../../permissions/permission.model';
import { User } from '../../models/user.model';
import { UsersService } from '../../services/user.service';
import { UserProfile } from './user-profile';

const me: User = {
    id: 'u-1',
    username: 'etudiant.un',
    email: 'etudiant@unh.edu',
    profiles: ['STUDENT'],
    enabled: true,
    created_at: '2026-10-01T08:00:00Z',
    updated_at: '2026-10-01T08:00:00Z',
    last_connected_at: null,
    avatar_url: null,
    authorities: ['identity:user:read:own', 'identity:user:update:own'],
    faculty_id: null
};

describe('UserProfile', () => {
    let fixture: ComponentFixture<UserProfile>;
    let component: UserProfile;
    let usersService: jasmine.SpyObj<UsersService>;
    let authService: jasmine.SpyObj<AuthService>;

    function setup(authorities: string[]): void {
        usersService = jasmine.createSpyObj<UsersService>('UsersService', ['getMe', 'updateMe', 'getUserById', 'updateUser']);
        usersService.getMe.and.returnValue(of(me));
        authService = jasmine.createSpyObj<AuthService>('AuthService', ['getCurrentUser', 'updateCurrentUser', 'getRefreshToken', 'clearSession']);
        authService.getCurrentUser.and.returnValue(me);

        TestBed.configureTestingModule({
            imports: [UserProfile],
            providers: [
                provideRouter([]),
                { provide: UsersService, useValue: usersService },
                { provide: AuthService, useValue: authService },
                {
                    provide: PermissionService,
                    useValue: { hasPermission: (permission: string) => authorities.includes(permission), canAccess: () => true }
                }
            ]
        });
        fixture = TestBed.createComponent(UserProfile);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    it('should load the own account through /users/me, never the admin route', () => {
        setup([IdentityPermission.UserReadOwn, IdentityPermission.UserUpdateOwn]);

        expect(usersService.getMe).toHaveBeenCalled();
        expect(usersService.getUserById).not.toHaveBeenCalled();
        expect(component.user()).toEqual(me);
    });

    it('should save username and email through PUT /users/me', () => {
        setup([IdentityPermission.UserReadOwn, IdentityPermission.UserUpdateOwn]);
        usersService.updateMe.and.returnValue(of({ ...me, email: 'nouveau@unh.edu' }));

        component.toggleEdit();
        component.form.patchValue({ email: 'nouveau@unh.edu' });
        component.save();

        expect(usersService.updateMe).toHaveBeenCalledOnceWith({ username: 'etudiant.un', email: 'nouveau@unh.edu' });
        expect(usersService.updateUser).not.toHaveBeenCalled();
        expect(authService.updateCurrentUser).toHaveBeenCalledWith(jasmine.objectContaining({ email: 'nouveau@unh.edu' }));
    });

    it('should stay read-only without identity:user:update:own', () => {
        setup([IdentityPermission.UserReadOwn]);

        expect(component.actions().map((action) => action.label)).toEqual(['Retour']);
        component.toggleEdit();
        expect(component.editing()).toBeFalse();
        component.save();
        expect(usersService.updateMe).not.toHaveBeenCalled();
    });
});
