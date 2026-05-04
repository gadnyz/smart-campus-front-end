import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '@/environments/environment';
import { PagedResponse, RegisterRequest, RegisterResponse, User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
    private readonly http = inject(HttpClient);

    getUsers(page: number = 0, size: number = 10): Observable<PagedResponse<User>> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());

        return this.http.get<PagedResponse<User>>(`${environment.apiBaseUrl}/api/v1/users`, { params });
    }

    createUser(payload: RegisterRequest): Observable<RegisterResponse> {
        return this.http.post<RegisterResponse>(`${environment.apiBaseUrl}/api/v1/auth/register`, payload);
    }
}
