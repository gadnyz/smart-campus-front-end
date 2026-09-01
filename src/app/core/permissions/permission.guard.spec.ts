import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { IdentityPermission } from '@/app/features/identity/permissions/permission.model';
import { PermissionService } from './permission.service';
import { permissionGuard } from './permission.guard';

describe('permissionGuard (RBAC — privilege escalation risk)', () => {
    let permissionService: jasmine.SpyObj<PermissionService>;
    let router: Router;

    function runGuard(data: Record<string, unknown>): boolean | UrlTree {
        const route = { data } as unknown as ActivatedRouteSnapshot;
        return TestBed.runInInjectionContext(() =>
            permissionGuard(route, {} as RouterStateSnapshot)
        ) as boolean | UrlTree;
    }

    beforeEach(() => {
        permissionService = jasmine.createSpyObj<PermissionService>('PermissionService', ['canAccess']);

        TestBed.configureTestingModule({
            providers: [provideRouter([]), { provide: PermissionService, useValue: permissionService }]
        });

        router = TestBed.inject(Router);
    });

    it('should allow access when the user holds UserReadAll for /settings/identity/users', () => {
        permissionService.canAccess.and.returnValue(true);

        const result = runGuard({
            permissions: [IdentityPermission.UserReadAll],
            mode: 'any'
        });

        expect(permissionService.canAccess).toHaveBeenCalledOnceWith({
            permissions: [IdentityPermission.UserReadAll],
            mode: 'any'
        });
        expect(result).toBeTrue();
    });

    it('should allow access when the user holds UserCreateAll for /settings/identity/users/new', () => {
        permissionService.canAccess.and.returnValue(true);

        const result = runGuard({
            permissions: [IdentityPermission.UserCreateAll],
            mode: 'any'
        });

        expect(result).toBeTrue();
    });

    it('should redirect to /access-denied when UserReadAll is missing', () => {
        permissionService.canAccess.and.returnValue(false);

        const result = runGuard({
            permissions: [IdentityPermission.UserReadAll],
            mode: 'any'
        });

        expect(result instanceof UrlTree).toBeTrue();
        expect(router.serializeUrl(result as UrlTree)).toBe('/access-denied');
    });

    it('should redirect to /access-denied when UserCreateAll is missing (escalation attempt)', () => {
        permissionService.canAccess.and.returnValue(false);

        const result = runGuard({
            permissions: [IdentityPermission.UserCreateAll],
            mode: 'any'
        });

        expect(result instanceof UrlTree).toBeTrue();
        expect(router.serializeUrl(result as UrlTree)).toBe('/access-denied');
    });

    it('should deny protected identity routes for a user with only UserReadOwn', () => {
        permissionService.canAccess.and.callFake((check) => {
            const held: readonly string[] = [IdentityPermission.UserReadOwn];
            const required = check?.permissions ?? [];
            return required.some((permission) => held.includes(permission));
        });

        const usersList = runGuard({
            permissions: [IdentityPermission.UserReadAll],
            mode: 'any'
        });
        const usersCreate = runGuard({
            permissions: [IdentityPermission.UserCreateAll],
            mode: 'any'
        });

        expect(router.serializeUrl(usersList as UrlTree)).toBe('/access-denied');
        expect(router.serializeUrl(usersCreate as UrlTree)).toBe('/access-denied');
    });
});
