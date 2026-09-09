import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@/environments/environment';
import {
    AssignLeadershipRequest,
    Faculty,
    FacultyLeadership,
    FacultyRequest
} from '../models/faculty.model';

@Injectable({ providedIn: 'root' })
export class FacultyService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/faculties`;

    getAll(): Observable<Faculty[]> {
        return this.http.get<Faculty[]>(this.baseUrl);
    }

    getById(id: string): Observable<Faculty> {
        return this.http.get<Faculty>(`${this.baseUrl}/${id}`);
    }

    create(payload: FacultyRequest): Observable<Faculty> {
        return this.http.post<Faculty>(this.baseUrl, payload);
    }

    update(id: string, payload: FacultyRequest): Observable<Faculty> {
        return this.http.put<Faculty>(`${this.baseUrl}/${id}`, payload);
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }

    getLeadership(facultyId: string): Observable<FacultyLeadership[]> {
        return this.http.get<FacultyLeadership[]>(`${this.baseUrl}/${facultyId}/leadership`);
    }

    assignLeadership(facultyId: string, payload: AssignLeadershipRequest): Observable<FacultyLeadership> {
        return this.http.post<FacultyLeadership>(`${this.baseUrl}/${facultyId}/leadership/assign`, payload);
    }

    revokeLeadership(facultyId: string, assignmentId: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${facultyId}/leadership/${assignmentId}`);
    }
}