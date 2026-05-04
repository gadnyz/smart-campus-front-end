import { HttpInterceptorFn } from '@angular/common/http';
import { AuthService } from '@/app/core/auth/services/auth.service';
import { inject } from '@angular/core';

const PUBLIC_AUTH_URLS = [
    '/api/v1/auth/login',
    '/api/v1/auth/logout',
    '/api/v1/auth/refresh-token',
    '/api/v1/auth/forgot-password',
    '/api/v1/auth/reset-password'
];


export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const isPublicAuthRoute = PUBLIC_AUTH_URLS.some((url) => req.url.includes(url));
    const authService = inject(AuthService);
    const token = authService.getAccessToken();

    if (isPublicAuthRoute || !token) {
        return next(req);
    }

    return next(
        req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        })
    );
};
