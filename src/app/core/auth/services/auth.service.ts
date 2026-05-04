import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '@/environments/environment';
import { AuthResponse, LoginRequest } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly http = inject(HttpClient);
    private readonly tokenKey = 'access_token';

    login(payload: LoginRequest): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${environment.apiBaseUrl}/api/v1/auth/login`, payload);
    }

    storeToken(token: string): void {
        sessionStorage.setItem(this.tokenKey, token);
    }

    getAccessToken(): string | null {
        return sessionStorage.getItem(this.tokenKey);
    }

    logout(): void {
        sessionStorage.removeItem(this.tokenKey);
    }
}
