import { DestroyRef, Injectable, Injector, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, firstValueFrom, map, of, throwError, tap } from 'rxjs';
import { environment } from '@/environments/environment';
import { AuthResponse, ForgotPasswordRequest, LoginRequest, LogoutRequest, RefreshRequest, ResetPasswordRequest } from '../models/auth.model';
import { AuthenticatedUser } from '@/app/core/auth/models/auth.model';

const ACCESS_SKEW_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly http = inject(HttpClient);
    private readonly injector = inject(Injector);
    private readonly destroyRef = inject(DestroyRef);

    readonly currentUser = signal<AuthenticatedUser | null>(this.readCurrentUser());
    private readonly accessTokenKey = 'access_token';
    private readonly refreshTokenKey = 'refresh_token';
    private readonly currentUserKey = 'current_user';
    private readonly expiresAtKey = 'expires_at';
    private readonly sessionKeys = [this.accessTokenKey, this.refreshTokenKey, this.currentUserKey, this.expiresAtKey];

    constructor() {
        this.bindStorageSync();
    }

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

        this.setItem(this.accessTokenKey, response.access_token);
        this.setItem(this.refreshTokenKey, response.refresh_token);
        this.setItem(this.currentUserKey, JSON.stringify(user));
        this.writeExpiry(response.expire_in);
        this.dropLegacySessionStorage();
        this.currentUser.set(user);
    }

    restoreSession(): Promise<void> {
        if (!this.getRefreshToken()) {
            return Promise.resolve();
        }

        this.currentUser.set(this.readCurrentUser());

        if (this.getAccessToken() && !this.isAccessExpired()) {
            return Promise.resolve();
        }

        return firstValueFrom(
            this.refreshCurrentSession().pipe(
                catchError((error: unknown) => {
                    if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
                        this.clearSession();
                    }

                    return of(null);
                }),
                map(() => undefined)
            )
        );
    }

    private readCurrentUser(): AuthenticatedUser | null {
        const storedUser = this.getItem(this.currentUserKey);

        if (!storedUser) {
            return null;
        }

        try {
            return JSON.parse(storedUser) as AuthenticatedUser;
        } catch {
            this.removeItem(this.currentUserKey);
            return null;
        }
    }

    getAccessToken(): string | null {
        return this.getItem(this.accessTokenKey);
    }

    getRefreshToken(): string | null {
        return this.getItem(this.refreshTokenKey);
    }

    getCurrentUser(): AuthenticatedUser | null {
        const storedUser = this.getItem(this.currentUserKey);

        if (!storedUser) {
            return null;
        }

        try {
            return JSON.parse(storedUser) as AuthenticatedUser;
        } catch {
            this.removeItem(this.currentUserKey);
            return null;
        }
    }

    updateCurrentUser(user: AuthenticatedUser): void {
        this.setItem(this.currentUserKey, JSON.stringify(user));
        this.currentUser.set(user);
    }

    isAuthenticated(): boolean {
        return !!this.getRefreshToken() || !!this.getAccessToken();
    }

    clearSession(): void {
        for (const key of this.sessionKeys) {
            this.removeItem(key);
        }

        this.dropLegacySessionStorage();
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

    private isAccessExpired(): boolean {
        const raw = this.getItem(this.expiresAtKey);

        if (!raw) {
            return false;
        }

        const expiresAt = Number(raw);

        if (!Number.isFinite(expiresAt)) {
            return false;
        }

        return Date.now() >= expiresAt - ACCESS_SKEW_MS;
    }

    private writeExpiry(expireIn: number): void {
        if (!Number.isFinite(expireIn) || expireIn <= 0) {
            this.removeItem(this.expiresAtKey);
            return;
        }

        this.setItem(this.expiresAtKey, String(Date.now() + expireIn * 1000));
    }

    private bindStorageSync(): void {
        if (typeof window === 'undefined') {
            return;
        }

        const onStorage = (event: StorageEvent) => this.handleStorageEvent(event);
        window.addEventListener('storage', onStorage);
        this.destroyRef.onDestroy(() => window.removeEventListener('storage', onStorage));
    }

    private handleStorageEvent(event: StorageEvent): void {
        if (event.storageArea && event.storageArea !== localStorage) {
            return;
        }

        if (event.key && !this.sessionKeys.includes(event.key)) {
            return;
        }

        const wasAuthenticated = this.currentUser() !== null;
        const isAuthenticated = this.isAuthenticated();
        this.currentUser.set(isAuthenticated ? this.readCurrentUser() : null);

        if (wasAuthenticated === isAuthenticated) {
            return;
        }

        const router = this.injector.get(Router);
        const url = router.url;

        if (!isAuthenticated && !url.startsWith('/auth/')) {
            void router.navigate(['/auth/login']);
            return;
        }

        if (isAuthenticated && (url.startsWith('/auth/login') || url === '/auth')) {
            void router.navigate(['/']);
        }
    }

    private getItem(key: string): string | null {
        if (typeof localStorage === 'undefined') {
            return null;
        }

        return localStorage.getItem(key);
    }

    private setItem(key: string, value: string): void {
        if (typeof localStorage === 'undefined') {
            return;
        }

        localStorage.setItem(key, value);
    }

    private removeItem(key: string): void {
        if (typeof localStorage === 'undefined') {
            return;
        }

        localStorage.removeItem(key);
    }

    private dropLegacySessionStorage(): void {
        if (typeof sessionStorage === 'undefined') {
            return;
        }

        for (const key of this.sessionKeys) {
            sessionStorage.removeItem(key);
        }
    }
}
