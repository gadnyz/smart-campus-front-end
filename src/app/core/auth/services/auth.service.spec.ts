import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '@/environments/environment';
import { AuthResponse } from '../models/auth.model';
import { AuthService } from './auth.service';

describe('AuthService', () => {
    let service: AuthService;
    let httpTesting: HttpTestingController;

    const authResponse: AuthResponse = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        token_type: 'Bearer',
        expire_in: 3600,
        user: {
            id: 'user-1',
            username: 'Campus Admin',
            email: 'admin@unh.edu',
            profiles: ['ADMIN'],
            enabled: true,
            created_at: '2026-05-16T08:00:00.000Z',
            updated_at: '2026-05-16T08:00:00.000Z',
            last_connected_at: null,
            avatar_url: null,
            authorities: ['ROLE_ADMIN']
        }
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
        });

        service = TestBed.inject(AuthService);
        httpTesting = TestBed.inject(HttpTestingController);
        localStorage.clear();
        sessionStorage.clear();
    });

    afterEach(() => {
        httpTesting.verify();
        localStorage.clear();
        sessionStorage.clear();
    });

    it('should post login credentials and return the auth response', () => {
        let actualResponse: AuthResponse | undefined;

        service.login({ email: 'admin@unh.edu', password: 'correct-password' }).subscribe((response) => {
            actualResponse = response;
        });

        const request = httpTesting.expectOne(`${environment.apiBaseUrl}/api/v1/auth/login`);
        expect(request.request.method).toBe('POST');
        expect(request.request.body).toEqual({
            email: 'admin@unh.edu',
            password: 'correct-password'
        });

        request.flush(authResponse);

        expect(actualResponse).toEqual(authResponse);
    });

    it('should surface failed login responses without creating a stored session', () => {
        let actualError: HttpErrorResponse | undefined;

        service.login({ email: 'admin@unh.edu', password: 'wrong-password' }).subscribe({
            next: () => fail('Expected login to fail.'),
            error: (error: HttpErrorResponse) => {
                actualError = error;
            }
        });

        const request = httpTesting.expectOne(`${environment.apiBaseUrl}/api/v1/auth/login`);
        request.flush({ detail: 'Invalid credentials.' }, { status: 401, statusText: 'Unauthorized' });

        expect(actualError?.status).toBe(401);
        expect(service.getAccessToken()).toBeNull();
        expect(service.getRefreshToken()).toBeNull();
        expect(service.getCurrentUser()).toBeNull();
        expect(service.isAuthenticated()).toBeFalse();
    });

    it('should store access token, refresh token and current user after login succeeds', () => {
        service.storeSession(authResponse);

        expect(service.getAccessToken()).toBe('access-token');
        expect(service.getRefreshToken()).toBe('refresh-token');
        expect(service.getCurrentUser()).toEqual(authResponse.user);
        expect(service.isAuthenticated()).toBeTrue();
    });

    it('should clear all session values when logout is called', () => {
        service.storeSession(authResponse);

        service.logout();

        expect(service.getAccessToken()).toBeNull();
        expect(service.getRefreshToken()).toBeNull();
        expect(service.getCurrentUser()).toBeNull();
        expect(service.isAuthenticated()).toBeFalse();
        expect(service.getLogoutPayload()).toBeNull();
        expect(localStorage.getItem('expires_at')).toBeNull();
    });

    it('should create a logout payload only when both tokens exist', () => {
        service.storeSession(authResponse);

        expect(service.getLogoutPayload()).toEqual({
            access_token: 'access-token',
            refresh_token: 'refresh-token'
        });

        localStorage.removeItem('refresh_token');

        expect(service.getLogoutPayload()).toBeNull();
    });

    it('should persist the session in localStorage so it is shared across tabs', () => {
        service.storeSession(authResponse);

        expect(localStorage.getItem('access_token')).toBe('access-token');
        expect(localStorage.getItem('refresh_token')).toBe('refresh-token');
        expect(localStorage.getItem('current_user')).toContain('admin@unh.edu');
        expect(localStorage.getItem('expires_at')).toBeTruthy();
        expect(sessionStorage.getItem('access_token')).toBeNull();
    });

    it('should consider the user authenticated when only a refresh token remains', () => {
        localStorage.setItem('refresh_token', 'refresh-token');

        expect(service.isAuthenticated()).toBeTrue();
    });

    it('should remove corrupt current user data when reading the session', () => {
        localStorage.setItem('access_token', 'access-token');
        localStorage.setItem('refresh_token', 'refresh-token');
        localStorage.setItem('current_user', '{bad-json');

        expect(service.getCurrentUser()).toBeNull();
        expect(localStorage.getItem('current_user')).toBeNull();
        expect(service.getAccessToken()).toBe('access-token');
        expect(service.getRefreshToken()).toBe('refresh-token');
    });

    it('should update the current user context in session storage', () => {
        const updatedUser = { ...authResponse.user, username: 'Updated User' };
        service.updateCurrentUser(updatedUser);
        expect(service.getCurrentUser()).toEqual(updatedUser);
    });

    it('should call the logout endpoint with the correct payload', () => {
        const logoutPayload = { access_token: 'access-token', refresh_token: 'refresh-token' };

        service.logoutRequest(logoutPayload).subscribe();

        const request = httpTesting.expectOne(`${environment.apiBaseUrl}/api/v1/auth/logout`);
        expect(request.request.method).toBe('POST');
        expect(request.request.body).toEqual(logoutPayload);
        request.flush(null);
    });

    it('should call the refresh token endpoint with the correct payload', () => {
        const refreshPayload = { refresh_token: 'refresh-token' };

        service.refreshToken(refreshPayload).subscribe();

        const request = httpTesting.expectOne(`${environment.apiBaseUrl}/api/v1/auth/refresh-token`);
        expect(request.request.method).toBe('POST');
        expect(request.request.body).toEqual(refreshPayload);
        request.flush(authResponse);
    });

    it('should refresh an expired access token during restoreSession', async () => {
        localStorage.setItem('refresh_token', 'old-refresh-token');
        localStorage.setItem('access_token', 'expired-access');
        localStorage.setItem('expires_at', String(Date.now() - 1_000));

        const restorePromise = service.restoreSession();

        const request = httpTesting.expectOne(`${environment.apiBaseUrl}/api/v1/auth/refresh-token`);
        expect(request.request.body).toEqual({ refresh_token: 'old-refresh-token' });
        request.flush(authResponse);

        await restorePromise;

        expect(service.getAccessToken()).toBe('access-token');
        expect(service.isAuthenticated()).toBeTrue();
    });

    it('should skip refresh during restoreSession when the access token is still valid', async () => {
        service.storeSession(authResponse);

        await service.restoreSession();

        httpTesting.expectNone(`${environment.apiBaseUrl}/api/v1/auth/refresh-token`);
        expect(service.getAccessToken()).toBe('access-token');
    });

    it('should clear the session when restoreSession receives 401 from refresh', async () => {
        localStorage.setItem('refresh_token', 'dead-refresh');
        localStorage.setItem('access_token', 'expired-access');
        localStorage.setItem('expires_at', String(Date.now() - 1_000));

        const restorePromise = service.restoreSession();

        const request = httpTesting.expectOne(`${environment.apiBaseUrl}/api/v1/auth/refresh-token`);
        request.flush({ detail: 'Expired' }, { status: 401, statusText: 'Unauthorized' });

        await restorePromise;

        expect(service.isAuthenticated()).toBeFalse();
        expect(service.getRefreshToken()).toBeNull();
    });

    it('should successfully refresh session when refresh token is present', () => {
        localStorage.setItem('refresh_token', 'old-refresh-token');

        let actualResponse: AuthResponse | undefined;
        service.refreshCurrentSession().subscribe((response) => {
            actualResponse = response;
        });

        const request = httpTesting.expectOne(`${environment.apiBaseUrl}/api/v1/auth/refresh-token`);
        expect(request.request.method).toBe('POST');
        expect(request.request.body).toEqual({ refresh_token: 'old-refresh-token' });
        request.flush(authResponse);

        expect(actualResponse).toEqual(authResponse);
        expect(service.getAccessToken()).toBe('access-token');
        expect(service.getRefreshToken()).toBe('refresh-token');
    });

    it('should throw an error when attempting to refresh session without a stored refresh token', () => {
        let actualError: Error | undefined;

        service.refreshCurrentSession().subscribe({
            next: () => fail('Expected refreshCurrentSession to fail.'),
            error: (err) => {
                actualError = err;
            }
        });

        expect(actualError?.message).toBe('Refresh token introuvable.');
        httpTesting.expectNone(`${environment.apiBaseUrl}/api/v1/auth/refresh-token`);
    });

    it('should navigate to login when another tab clears the shared session', () => {
        const router = TestBed.inject(Router);
        spyOn(router, 'navigate').and.resolveTo(true);
        service.storeSession(authResponse);

        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('current_user');
        localStorage.removeItem('expires_at');

        window.dispatchEvent(
            new StorageEvent('storage', {
                key: 'refresh_token',
                newValue: null,
                storageArea: localStorage
            })
        );

        expect(service.currentUser()).toBeNull();
        expect(service.isAuthenticated()).toBeFalse();
        expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
    });
});
