import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, tap } from 'rxjs';
import { environment } from '@/environments/environment';
import { AuthResponse, ForgotPasswordRequest, LoginRequest, LogoutRequest, RefreshRequest, ResetPasswordRequest } from '../models/auth.model';
import { AuthenticatedUser } from '@/app/core/auth/models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly http = inject(HttpClient);
    readonly currentUser = signal<AuthenticatedUser | null>(this.readCurrentUser());
    private readonly accessTokenKey = 'access_token';
    private readonly refreshTokenKey = 'refresh_token';
    private readonly currentUserKey = 'current_user';

    login(payload: LoginRequest): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${environment.apiBaseUrl}/api/v1/auth/login`, payload);
    }

    storeSession(response: AuthResponse): void {
        const previousUser = this.currentUser();
        const user = {
            ...response.user,
            avatar_url:
                response.user.avatar_url ??
                previousUser?.avatar_url ??
                null
        };

        sessionStorage.setItem(this.accessTokenKey, response.access_token);
        sessionStorage.setItem(this.refreshTokenKey, response.refresh_token);
        sessionStorage.setItem(this.currentUserKey, JSON.stringify(user));
        this.currentUser.set(user);
    }

    private readCurrentUser(): AuthenticatedUser  | null {
        const storedUser = sessionStorage.getItem(this.currentUserKey);

        if (!storedUser) {
            return null;
        }

        try {
            return JSON.parse(storedUser) as AuthenticatedUser ;
        } catch {
            sessionStorage.removeItem(this.currentUserKey);
            return null;
        }
    }

    getAccessToken(): string | null {
        return sessionStorage.getItem(this.accessTokenKey);
    }

    getRefreshToken(): string | null {
        return sessionStorage.getItem(this.refreshTokenKey);
    }

    getCurrentUser(): AuthenticatedUser  | null {
        const storedUser = sessionStorage.getItem(this.currentUserKey);

        if (!storedUser) {
            return null;
        }

        try {
            return JSON.parse(storedUser) as AuthenticatedUser ;
        } catch {
            sessionStorage.removeItem(this.currentUserKey);
            return null;
        }
    }

    updateCurrentUser(user: AuthenticatedUser ): void {
        sessionStorage.setItem(this.currentUserKey, JSON.stringify(user));
        this.currentUser.set(user);
    }

    isAuthenticated(): boolean {
        return !!this.getAccessToken();
    }

    clearSession(): void {
        sessionStorage.removeItem(this.accessTokenKey);
        sessionStorage.removeItem(this.refreshTokenKey);
        sessionStorage.removeItem(this.currentUserKey);
        this.currentUser.set(null);
    }

    logout(): void {
        this.clearSession();
    }

    getLogoutPayload(): LogoutRequest | null {
        const accessToken = this.getAccessToken();
        const refreshToken = this.getRefreshToken();

        if (!accessToken || !refreshToken) {
            return null;
        }

        return {
            access_token: accessToken,
            refresh_token: refreshToken
        };
    }

    logoutRequest(payload: LogoutRequest): Observable<void> {
        return this.http.post<void>(`${environment.apiBaseUrl}/api/v1/auth/logout`, payload);
    }

    refreshToken(payload: RefreshRequest): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${environment.apiBaseUrl}/api/v1/auth/refresh-token`, payload);
    }

    refreshCurrentSession(): Observable<AuthResponse> {
        const refreshToken = this.getRefreshToken();

        if (!refreshToken) {
            return throwError(() => new Error('Refresh token introuvable.'));
        }

        return this.refreshToken({ refresh_token: refreshToken }).pipe(tap((response) => this.storeSession(response)));
    }

    forgotPassword(payload: ForgotPasswordRequest): Observable<void> {
        return this.http.post<void>(
            `${environment.apiBaseUrl}/api/v1/auth/forgot-password`,
            payload
        );
    }

    resetPassword(payload: ResetPasswordRequest): Observable<void> {
        return this.http.post<void>(
            `${environment.apiBaseUrl}/api/v1/auth/reset-password`,
            payload
        );
    }
}