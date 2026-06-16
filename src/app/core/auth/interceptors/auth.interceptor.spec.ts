import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';
import { AuthResponse } from '../models/auth.model';

describe('authInterceptor', () => {
    let httpClient: HttpClient;
    let httpTesting: HttpTestingController;
    let authService: AuthService;
    let router: Router;

    const authResponse: AuthResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
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
            providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()]
        });

        httpClient = TestBed.inject(HttpClient);
        httpTesting = TestBed.inject(HttpTestingController);
        authService = TestBed.inject(AuthService);
        router = TestBed.inject(Router);
        spyOn(router, 'navigate').and.resolveTo(true);
        sessionStorage.clear();
    });

    afterEach(() => {
        httpTesting.verify();
        sessionStorage.clear();
    });

    it('should add Authorization header for API requests when token exists', () => {
        sessionStorage.setItem('access_token', 'my-token');

        httpClient.get('/api/v1/users').subscribe();

        const req = httpTesting.expectOne('/api/v1/users');
        expect(req.request.headers.has('Authorization')).toBeTrue();
        expect(req.request.headers.get('Authorization')).toBe('Bearer my-token');
        req.flush([]);
    });

    it('should not add Authorization header for public auth URLs', () => {
        sessionStorage.setItem('access_token', 'my-token');

        httpClient.post('/api/v1/auth/login', {}).subscribe();

        const req = httpTesting.expectOne('/api/v1/auth/login');
        expect(req.request.headers.has('Authorization')).toBeFalse();
        req.flush({});
    });

    it('should not add Authorization header for non-API requests', () => {
        sessionStorage.setItem('access_token', 'my-token');

        httpClient.get('assets/i18n/fr.json').subscribe();

        const req = httpTesting.expectOne('assets/i18n/fr.json');
        expect(req.request.headers.has('Authorization')).toBeFalse();
        req.flush({});
    });

    it('should not add Authorization header if access token is missing', () => {
        httpClient.get('/api/v1/users').subscribe();

        const req = httpTesting.expectOne('/api/v1/users');
        expect(req.request.headers.has('Authorization')).toBeFalse();
        req.flush([]);
    });

    it('should attempt to refresh token and retry request on 401 response', () => {
        sessionStorage.setItem('access_token', 'old-token');
        sessionStorage.setItem('refresh_token', 'refresh-token');

        spyOn(authService, 'refreshCurrentSession').and.returnValue(of(authResponse));
        spyOn(authService, 'clearSession').and.callThrough();

        let responseData: any;
        httpClient.get('/api/v1/users').subscribe((res) => {
            responseData = res;
        });

        // 1. Initial request fails with 401
        const req1 = httpTesting.expectOne('/api/v1/users');
        expect(req1.request.headers.get('Authorization')).toBe('Bearer old-token');
        req1.flush({ detail: 'Token expired' }, { status: 401, statusText: 'Unauthorized' });

        // 2. Expect token refresh to have been called
        expect(authService.refreshCurrentSession).toHaveBeenCalledOnceWith();

        // 3. Expect request to be retried with new token
        const req2 = httpTesting.expectOne('/api/v1/users');
        expect(req2.request.headers.get('Authorization')).toBe('Bearer new-access-token');
        req2.flush([{ id: 1 }]);

        expect(responseData).toEqual([{ id: 1 }]);
        expect(authService.clearSession).not.toHaveBeenCalled();
        expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should clear session and redirect to login on 401 if refresh token is missing', () => {
        sessionStorage.setItem('access_token', 'old-token');
        // no refresh token

        spyOn(authService, 'clearSession').and.callThrough();

        let actualError: any;
        httpClient.get('/api/v1/users').subscribe({
            next: () => fail('Expected request to fail.'),
            error: (err) => {
                actualError = err;
            }
        });

        const req = httpTesting.expectOne('/api/v1/users');
        req.flush({ detail: 'Token expired' }, { status: 401, statusText: 'Unauthorized' });

        expect(authService.clearSession).toHaveBeenCalledOnceWith();
        expect(router.navigate).toHaveBeenCalledOnceWith(['/auth/login']);
        expect(actualError.message).toBe('Session expirée.');
    });

    it('should clear session and redirect to login on 401 if token refresh request fails', () => {
        sessionStorage.setItem('access_token', 'old-token');
        sessionStorage.setItem('refresh_token', 'refresh-token');

        spyOn(authService, 'refreshCurrentSession').and.returnValue(throwError(() => new Error('Refresh failed')));
        spyOn(authService, 'clearSession').and.callThrough();

        let actualError: any;
        httpClient.get('/api/v1/users').subscribe({
            next: () => fail('Expected request to fail.'),
            error: (err) => {
                actualError = err;
            }
        });

        const req = httpTesting.expectOne('/api/v1/users');
        req.flush({ detail: 'Token expired' }, { status: 401, statusText: 'Unauthorized' });

        expect(authService.clearSession).toHaveBeenCalledOnceWith();
        expect(router.navigate).toHaveBeenCalledOnceWith(['/auth/login']);
        expect(actualError.message).toBe('Refresh failed');
    });

    it('should de-duplicate multiple concurrent refresh requests', () => {
        sessionStorage.setItem('access_token', 'old-token');
        sessionStorage.setItem('refresh_token', 'refresh-token');

        const refreshSubject = new Subject<AuthResponse>();
        const refreshSpy = spyOn(authService, 'refreshCurrentSession').and.returnValue(refreshSubject.asObservable());

        let res1: any;
        let res2: any;

        httpClient.get('/api/v1/users/1').subscribe((res) => (res1 = res));
        httpClient.get('/api/v1/users/2').subscribe((res) => (res2 = res));

        const req1 = httpTesting.expectOne('/api/v1/users/1');
        const req2 = httpTesting.expectOne('/api/v1/users/2');

        // Both fail with 401
        req1.flush({ detail: 'Token expired' }, { status: 401, statusText: 'Unauthorized' });
        req2.flush({ detail: 'Token expired' }, { status: 401, statusText: 'Unauthorized' });

        // refreshCurrentSession should be called exactly once
        expect(refreshSpy).toHaveBeenCalledOnceWith();

        // Emitting new session response resolves the refresh subject
        refreshSubject.next(authResponse);
        refreshSubject.complete();

        // Both requests are retried with the new token
        const retry1 = httpTesting.expectOne('/api/v1/users/1');
        const retry2 = httpTesting.expectOne('/api/v1/users/2');

        expect(retry1.request.headers.get('Authorization')).toBe('Bearer new-access-token');
        expect(retry2.request.headers.get('Authorization')).toBe('Bearer new-access-token');

        retry1.flush({ id: 1 });
        retry2.flush({ id: 2 });

        expect(res1).toEqual({ id: 1 });
        expect(res2).toEqual({ id: 2 });
    });
});
