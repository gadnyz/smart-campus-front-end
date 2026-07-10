import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
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
            profile: 'ADMIN',
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
            providers: [provideHttpClient(), provideHttpClientTesting()]
        });

        service = TestBed.inject(AuthService);
        httpTesting = TestBed.inject(HttpTestingController);
        sessionStorage.clear();
    });

    afterEach(() => {
        httpTesting.verify();
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
    });

    it('should create a logout payload only when both tokens exist', () => {
        service.storeSession(authResponse);

        expect(service.getLogoutPayload()).toEqual({
            access_token: 'access-token',
            refresh_token: 'refresh-token'
        });

        sessionStorage.removeItem('refresh_token');

        expect(service.getLogoutPayload()).toBeNull();
    });

    it('should remove corrupt current user data when reading the session', () => {
        sessionStorage.setItem('access_token', 'access-token');
        sessionStorage.setItem('refresh_token', 'refresh-token');
        sessionStorage.setItem('current_user', '{bad-json');

        expect(service.getCurrentUser()).toBeNull();
        expect(sessionStorage.getItem('current_user')).toBeNull();
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

    it('should successfully refresh session when refresh token is present', () => {
        sessionStorage.setItem('refresh_token', 'old-refresh-token');

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
});
