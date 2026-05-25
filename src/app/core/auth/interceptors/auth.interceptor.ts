import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, shareReplay, switchMap, throwError } from 'rxjs';
import { AuthResponse } from '../models/auth.model';
import { AuthService } from '../services/auth.service';

const PUBLIC_AUTH_URLS = ['/api/v1/auth/login', '/api/v1/auth/logout', '/api/v1/auth/refresh-token', '/api/v1/auth/forgot-password', '/api/v1/auth/reset-password'];

let refreshRequest$: Observable<AuthResponse> | null = null;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const isApiRequest = req.url.startsWith('/api/') || req.url.includes('/api/');
    const isPublicAuthRoute = PUBLIC_AUTH_URLS.some((url) => req.url.includes(url));

    const token = authService.getAccessToken();

    const authReq = isApiRequest && !isPublicAuthRoute && token ? addAuthorizationHeader(req, token) : req;

    return next(authReq).pipe(
        catchError((error: unknown) => {
            if (!(error instanceof HttpErrorResponse) || error.status !== 401 || !isApiRequest || isPublicAuthRoute) {
                return throwError(() => error);
            }

            return refreshAndRetry(authReq, next, authService, router);
        })
    );
};

function refreshAndRetry(req: HttpRequest<unknown>, next: HttpHandlerFn, authService: AuthService, router: Router): Observable<HttpEvent<unknown>> {
    const refreshToken = authService.getRefreshToken();

    if (!refreshToken) {
        endSession(authService, router);
        return throwError(() => new Error('Session expirée.'));
    }

    if (!refreshRequest$) {
        refreshRequest$ = authService.refreshCurrentSession().pipe(
            catchError((error) => {
                endSession(authService, router);
                return throwError(() => error);
            }),
            finalize(() => {
                refreshRequest$ = null;
            }),
            shareReplay(1)
        );
    }

    return refreshRequest$.pipe(switchMap((response) => next(addAuthorizationHeader(req, response.access_token))));
}

function addAuthorizationHeader(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
    return req.clone({
        setHeaders: {
            Authorization: `Bearer ${token}`
        }
    });
}

function endSession(authService: AuthService, router: Router): void {
    authService.clearSession();
    void router.navigate(['/auth/login']);
}
