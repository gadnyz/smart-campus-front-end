import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '@/environments/environment';
import { AuthResponse, LoginRequest, LogoutRequest } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly http = inject(HttpClient);

    private readonly accessTokenKey = 'access_token';
    private readonly refreshTokenKey = 'refresh_token';

    login(payload: LoginRequest): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${environment.apiBaseUrl}/api/v1/auth/login`, payload);
    }

    storeSession(response: AuthResponse): void {
        sessionStorage.setItem(this.accessTokenKey, response.access_token);
        sessionStorage.setItem(this.refreshTokenKey, response.refresh_token);
    }

    getAccessToken(): string | null {
        return sessionStorage.getItem(this.accessTokenKey);
    }

    getRefreshToken(): string | null {
        return sessionStorage.getItem(this.refreshTokenKey);
    }

    isAuthenticated(): boolean {
        return !!this.getAccessToken();
    }

    clearSession(): void {
        sessionStorage.removeItem(this.accessTokenKey);
        sessionStorage.removeItem(this.refreshTokenKey);
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
        }
    }

    logoutRequest(payload: LogoutRequest): Observable<void> {
        return this.http.post<void>(`${environment.apiBaseUrl}/api/v1/auth/logout`, payload);
    }

}
