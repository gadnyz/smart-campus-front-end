import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '@/environments/environment';
import { AvatarUploadUrlResponse, ConfirmAvatarRequest, ConfirmAvatarResponse, RegisterRequest, RegisterResponse, UpdateUserRequest, User, UserProfileResponse } from '../models/user.model';

export interface PageableQuery {
    page?: number;
    size?: number;
    sort?: string[];
}

export interface PagedResponse<T> {
    content: T[];
    page: number;
    size: number;
    total_elements: number;
    total_pages: number;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/users`;
    private readonly authBaseUrl = `${environment.apiBaseUrl}/api/v1/auth`;
    private readonly profilesUrl = `${environment.apiBaseUrl}/api/v1/profiles`;

    getUsers(query: PageableQuery = {}): Observable<PagedResponse<User>> {
        let params = new HttpParams();

        if (query.page !== undefined) {
            params = params.set('page', query.page);
        }

        if (query.size !== undefined) {
            params = params.set('size', query.size);
        }

        if (query.sort?.length) {
            query.sort.forEach((value) => {
                params = params.append('sort', value);
            });
        }

        return this.http.get<PagedResponse<User>>(this.baseUrl, { params });
    }

    getProfiles(query: PageableQuery = { page: 0, size: 100, sort: ['name,asc'] }): Observable<PagedResponse<UserProfileResponse>> {
        let params = new HttpParams();

        if (query.page !== undefined) {
            params = params.set('page', query.page);
        }

        if (query.size !== undefined) {
            params = params.set('size', query.size);
        }

        if (query.sort?.length) {
            query.sort.forEach((value) => {
                params = params.append('sort', value);
            });
        }

        return this.http.get<PagedResponse<UserProfileResponse>>(this.profilesUrl, { params });
    }

    getUserById(userId: string): Observable<User> {
        return this.http.get<User>(`${this.baseUrl}/${userId}`);
    }

    createUser(payload: RegisterRequest): Observable<RegisterResponse> {
        return this.http.post<RegisterResponse>(`${this.authBaseUrl}/register`, payload);
    }

    updateUser(userId: string, payload: UpdateUserRequest): Observable<User> {
        return this.http.put<User>(`${this.baseUrl}/${userId}`, payload);
    }

    deleteUser(userId: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${userId}`);
    }

    enableUser(userId: string): Observable<void> {
        return this.http.put<void>(`${this.baseUrl}/${userId}/enable`, {});
    }

    disableUser(userId: string): Observable<void> {
        return this.http.put<void>(`${this.baseUrl}/${userId}/disable`, {});
    }

    requestAvatarUploadUrl(extension: string): Observable<AvatarUploadUrlResponse> {
        const normalizedExtension = extension.startsWith('.') ? extension : `.${extension}`;
        const params = new HttpParams().set('extension', normalizedExtension);

        return this.http.get<AvatarUploadUrlResponse>(`${this.baseUrl}/me/avatar/upload-url`, { params });
    }

    uploadAvatarFile(uploadUrl: string, file: File): Observable<string> {
        return this.http.put(uploadUrl, file, {
            headers: {
                'Content-Type': file.type
            },
            responseType: 'text'
        });
    }

    confirmAvatarUpload(payload: ConfirmAvatarRequest): Observable<ConfirmAvatarResponse> {
        return this.http.post<ConfirmAvatarResponse>(`${this.baseUrl}/me/avatar/confirm`, payload);
    }
}
