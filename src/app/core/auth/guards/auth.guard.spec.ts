import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { AuthResponse } from '../models/auth.model';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
    let authService: AuthService;
    let router: Router;

    const authResponse: AuthResponse = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        token_type: 'Bearer',
        expire_in: 3600,
        user: {
            id: 'user-1',
            username: 'Campus Admin',
            email: 'admin@unh.edu',
            profile: 'ADMIN',
            enabled: true,
            created_at: '2026-05-16T08:00:00.000Z',
            updated_at: '2026-05-16T08:00:00.000Z',
            last_connected_at: null,
            avatar_url: null,
            authorities: ['ROLE_ADMIN']
        }
    };

    function runGuard(): boolean | UrlTree {
        return TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)) as boolean | UrlTree;
    }

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
        });

        authService = TestBed.inject(AuthService);
        router = TestBed.inject(Router);
        sessionStorage.clear();
    });

    afterEach(() => {
        sessionStorage.clear();
    });

    it('should allow protected routes while the user is authenticated', () => {
        authService.storeSession(authResponse);

        expect(runGuard()).toBeTrue();
    });

    it('should make protected routes inaccessible after logout', () => {
        authService.storeSession(authResponse);
        authService.logout();

        const result = runGuard();

        expect(result instanceof UrlTree).toBeTrue();
        expect(router.serializeUrl(result as UrlTree)).toBe('/auth/login');
    });
});
