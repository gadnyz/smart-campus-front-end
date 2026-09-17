import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';
import { environment } from '@/environments/environment';
import { Professor, ProfessorRequest } from '../models/professor.model';

@Injectable({ providedIn: 'root' })
export class ProfessorService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/professors`;

    getAll(): Observable<Professor[]> {
        return this.http.get<Professor[] | { content?: Professor[] }>(this.baseUrl).pipe(map(asList));
    }

    getById(id: string): Observable<Professor> {
        return this.http.get<Professor>(`${this.baseUrl}/${id}`);
    }

    getByFaculty(facultyId: string): Observable<Professor[]> {
        return this.http
            .get<Professor[] | { content?: Professor[] }>(`${this.baseUrl}/faculty/${facultyId}`)
            .pipe(map(asList));
    }

    getByGrade(gradeId: string): Observable<Professor[]> {
        return this.http
            .get<Professor[] | { content?: Professor[] }>(`${this.baseUrl}/grade/${gradeId}`)
            .pipe(map(asList));
    }

    getMe(): Observable<Professor> {
        return this.http.get<Professor>(`${this.baseUrl}/me`);
    }

    resolveCurrent(userId?: string | null, email?: string | null): Observable<Professor | null> {
        return this.getMe().pipe(
            catchError(() =>
                this.getAll().pipe(
                    map(
                        (professors) =>
                            professors.find(
                                (professor) =>
                                    (!!userId && professor.user_id === userId) ||
                                    (!!email && professor.email?.toLowerCase() === email.toLowerCase())
                            ) ?? null
                    )
                )
            )
        );
    }

    create(payload: ProfessorRequest): Observable<Professor> {
        return this.http.post<Professor>(this.baseUrl, payload);
    }

    update(id: string, payload: ProfessorRequest): Observable<Professor> {
        return this.http.put<Professor>(`${this.baseUrl}/${id}`, payload);
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }
}

function asList<T>(body: T[] | { content?: T[] } | null | undefined): T[] {
    if (Array.isArray(body)) {
        return body;
    }

    return body?.content ?? [];
}
