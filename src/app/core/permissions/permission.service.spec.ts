import { TestBed } from '@angular/core/testing';
import { AuthService } from '@/app/core/auth/services/auth.service';
import { AuthenticatedUser } from '@/app/core/auth/models/auth.model';
import { IdentityPermission } from '@/app/features/identity/permissions/permission.model';
import { PermissionService } from './permission.service';

describe('PermissionService', () => {
    let service: PermissionService;
    let authService: jasmine.SpyObj<AuthService>;

    const userWith = (authorities: string[]): AuthenticatedUser => ({
        id: 'user-1',
        username: 'tester',
        email: 'tester@unh.edu',
        profiles: ['STAFF'],
        enabled: true,
        created_at: '2026-05-16T08:00:00.000Z',
        updated_at: '2026-05-16T08:00:00.000Z',
        last_connected_at: null,
        avatar_url: null,
        authorities
    });

    beforeEach(() => {
        authService = jasmine.createSpyObj<AuthService>('AuthService', ['getCurrentUser']);

        TestBed.configureTestingModule({
            providers: [{ provide: AuthService, useValue: authService }]
        });

        service = TestBed.inject(PermissionService);
    });

    describe('getCurrentPermissions', () => {
        it('should return an empty list when no user is authenticated', () => {
            authService.getCurrentUser.and.returnValue(null);

            expect(service.getCurrentPermissions()).toEqual([]);
        });

        it('should return an empty list when the user has no authorities', () => {
            authService.getCurrentUser.and.returnValue(userWith([]));

            expect(service.getCurrentPermissions()).toEqual([]);
        });

        it('should return the user authorities as current permissions', () => {
            authService.getCurrentUser.and.returnValue(
                userWith([IdentityPermission.UserReadAll, IdentityPermission.UserCreateAll])
            );

            expect(service.getCurrentPermissions()).toEqual([
                IdentityPermission.UserReadAll,
                IdentityPermission.UserCreateAll
            ]);
        });
    });

    describe('hasPermission', () => {
        it('should return true when the permission is present', () => {
            authService.getCurrentUser.and.returnValue(userWith([IdentityPermission.UserReadAll]));

            expect(service.hasPermission(IdentityPermission.UserReadAll)).toBeTrue();
        });

        it('should return false when the permission is absent', () => {
            authService.getCurrentUser.and.returnValue(userWith([IdentityPermission.UserReadOwn]));

            expect(service.hasPermission(IdentityPermission.UserReadAll)).toBeFalse();
        });
    });

    describe('hasAnyPermission (mode any)', () => {
        it('should return true for an empty permission list (vacuous truth)', () => {
            authService.getCurrentUser.and.returnValue(userWith([]));

            expect(service.hasAnyPermission([])).toBeTrue();
        });

        it('should return true when at least one required permission matches', () => {
            authService.getCurrentUser.and.returnValue(userWith([IdentityPermission.UserCreateAll]));

            expect(
                service.hasAnyPermission([IdentityPermission.UserReadAll, IdentityPermission.UserCreateAll])
            ).toBeTrue();
        });

        it('should return false when none of the required permissions match', () => {
            authService.getCurrentUser.and.returnValue(userWith([IdentityPermission.UserReadOwn]));

            expect(
                service.hasAnyPermission([IdentityPermission.UserReadAll, IdentityPermission.UserCreateAll])
            ).toBeFalse();
        });
    });

    describe('hasAllPermissions (mode all)', () => {
        it('should return true for an empty permission list (vacuous truth)', () => {
            authService.getCurrentUser.and.returnValue(userWith([]));

            expect(service.hasAllPermissions([])).toBeTrue();
        });

        it('should return true when every required permission matches', () => {
            authService.getCurrentUser.and.returnValue(
                userWith([IdentityPermission.UserReadAll, IdentityPermission.UserCreateAll])
            );

            expect(
                service.hasAllPermissions([IdentityPermission.UserReadAll, IdentityPermission.UserCreateAll])
            ).toBeTrue();
        });

        it('should return false when one required permission is missing', () => {
            authService.getCurrentUser.and.returnValue(userWith([IdentityPermission.UserReadAll]));

            expect(
                service.hasAllPermissions([IdentityPermission.UserReadAll, IdentityPermission.UserCreateAll])
            ).toBeFalse();
        });
    });

    describe('canAccess', () => {
        it('should allow access when no check is provided', () => {
            authService.getCurrentUser.and.returnValue(null);

            expect(service.canAccess()).toBeTrue();
            expect(service.canAccess(undefined)).toBeTrue();
            expect(service.canAccess({})).toBeTrue();
            expect(service.canAccess({ permissions: [] })).toBeTrue();
        });

        it('should default to mode any when mode is omitted', () => {
            authService.getCurrentUser.and.returnValue(userWith([IdentityPermission.UserCreateAll]));

            expect(
                service.canAccess({
                    permissions: [IdentityPermission.UserReadAll, IdentityPermission.UserCreateAll]
                })
            ).toBeTrue();
        });

        it('should enforce mode all when specified', () => {
            authService.getCurrentUser.and.returnValue(userWith([IdentityPermission.UserCreateAll]));

            expect(
                service.canAccess({
                    permissions: [IdentityPermission.UserReadAll, IdentityPermission.UserCreateAll],
                    mode: 'all'
                })
            ).toBeFalse();
        });

        it('should allow mode all when the user holds every required permission', () => {
            authService.getCurrentUser.and.returnValue(
                userWith([IdentityPermission.UserReadAll, IdentityPermission.UserCreateAll])
            );

            expect(
                service.canAccess({
                    permissions: [IdentityPermission.UserReadAll, IdentityPermission.UserCreateAll],
                    mode: 'all'
                })
            ).toBeTrue();
        });
    });
});
