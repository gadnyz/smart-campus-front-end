import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { environment } from '@/environments/environment';
import {
    AddPrivilegesRequest,
    AddRolesRequest,
    CreatePrivilegeRequest,
    CreateProfileRequest,
    CreateRoleRequest,
    PageableQuery,
    PagedResponse,
    PrivilegeResponse,
    RoleResponse,
    UserProfileResponse
} from '../models/identity-management.model';

@Injectable({ providedIn: 'root' })
export class IdentityManagementService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiBaseUrl}/api/v1`;

    getRoles(query: PageableQuery = { page: 0, size: 100, sort: ['name,asc'] }, name?: string): Observable<PagedResponse<RoleResponse>> {
        let params = this.buildPageableParams(query);

        if (name) {
            params = params.set('name', name);
        }

        return this.http.get<PagedResponse<RoleResponse>>(`${this.baseUrl}/roles`, { params });
    }

    getRoleById(roleId: string): Observable<RoleResponse> {
        return this.http.get<RoleResponse>(`${this.baseUrl}/roles/${roleId}`);
    }

    createRole(payload: CreateRoleRequest): Observable<RoleResponse> {
        return this.http.post<RoleResponse>(`${this.baseUrl}/roles`, payload);
    }

    addPrivilegesToRole(roleId: string, payload: AddPrivilegesRequest): Observable<void> {
        return this.http.post<void>(`${this.baseUrl}/roles/${roleId}/privileges`, payload);
    }

    getPrivileges(query: PageableQuery = { page: 0, size: 100, sort: ['name,asc'] }): Observable<PagedResponse<PrivilegeResponse>> {
        return this.http.get<PagedResponse<PrivilegeResponse>>(`${this.baseUrl}/privileges`, {
            params: this.buildPageableParams(query)
        });
    }

    /** Loads every privilege page (avoids backend size limits on a single request). */
    getAllPrivileges(pageSize = 100): Observable<PrivilegeResponse[]> {
        const fetchPage = (page: number, acc: PrivilegeResponse[]): Observable<PrivilegeResponse[]> =>
            this.getPrivileges({ page, size: pageSize, sort: ['name,asc'] }).pipe(
                switchMap((response) => {
                    const next = [...acc, ...(response.content ?? [])];
                    const totalPages = Math.max(response.total_pages ?? 1, 1);

                    if (page + 1 >= totalPages) {
                        return of(next);
                    }

                    return fetchPage(page + 1, next);
                })
            );

        return fetchPage(0, []);
    }

    getPrivilegeById(privilegeId: string): Observable<PrivilegeResponse> {
        return this.http.get<PrivilegeResponse>(`${this.baseUrl}/privileges/${privilegeId}`);
    }

    createPrivilege(payload: CreatePrivilegeRequest): Observable<PrivilegeResponse> {
        return this.http.post<PrivilegeResponse>(`${this.baseUrl}/privileges`, payload);
    }

    deletePrivilege(privilegeId: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/privileges/${privilegeId}`);
    }

    getProfiles(query: PageableQuery = { page: 0, size: 100, sort: ['name,asc'] }): Observable<PagedResponse<UserProfileResponse>> {
        return this.http.get<PagedResponse<UserProfileResponse>>(`${this.baseUrl}/profiles`, {
            params: this.buildPageableParams(query)
        });
    }

    getProfileById(profileId: string): Observable<UserProfileResponse> {
        return this.http.get<UserProfileResponse>(`${this.baseUrl}/profiles/${profileId}`);
    }

    createProfile(payload: CreateProfileRequest): Observable<UserProfileResponse> {
        return this.http.post<UserProfileResponse>(`${this.baseUrl}/profiles`, payload);
    }

    deleteProfile(profileId: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/profiles/${profileId}`);
    }

    addRolesToProfile(profileId: string, payload: AddRolesRequest): Observable<void> {
        return this.http.post<void>(`${this.baseUrl}/profiles/${profileId}/roles`, payload);
    }

    private buildPageableParams(query: PageableQuery): HttpParams {
        let params = new HttpParams();

        if (query.page !== undefined) {
            params = params.set('page', query.page);
        }

        if (query.size !== undefined) {
            params = params.set('size', query.size);
        }

        query.sort?.forEach((value) => {
            params = params.append('sort', value);
        });

        return params;
    }
}