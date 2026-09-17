import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';
import { environment } from '@/environments/environment';
import { Professor, ProfessorRequest, normalizeProfessor } from '../models/professor.model';
import { asList } from '../utils/academic-http';

@Injectable({ providedIn: 'root' })
export class ProfessorService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/professors`;

    getAll(): Observable<Professor[]> {
        const params = new HttpParams().set('page', 0).set('size', 100);
        return this.http
            .get<unknown>(this.baseUrl, { params })
            .pipe(map((body) => asList(body).map(normalizeProfessor)));
    }

    getById(id: string): Observable<Professor> {
        return this.http.get<unknown>(`${this.baseUrl}/${id}`).pipe(map(normalizeProfessor));
    }

    getByFaculty(facultyId: string): Observable<Professor[]> {
        const params = new HttpParams().set('page', 0).set('size', 100);
        return this.http
            .get<unknown>(`${this.baseUrl}/faculty/${facultyId}`, { params })
            .pipe(map((body) => asList(body).map(normalizeProfessor)));
    }

    getByGrade(gradeId: string): Observable<Professor[]> {
        const params = new HttpParams().set('page', 0).set('size', 100);
        return this.http
            .get<unknown>(`${this.baseUrl}/grade/${gradeId}`, { params })
            .pipe(map((body) => asList(body).map(normalizeProfessor)));
    }

    getMe(): Observable<Professor> {
        return this.http.get<unknown>(`${this.baseUrl}/me`).pipe(map(normalizeProfessor));
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
        return this.http.post<unknown>(this.baseUrl, toProfessorApiBody(payload)).pipe(map(normalizeProfessor));
    }

    update(id: string, payload: ProfessorRequest): Observable<Professor> {
        return this.http
            .put<unknown>(`${this.baseUrl}/${id}`, toProfessorApiBody(payload))
            .pipe(map(normalizeProfessor));
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }
}

function toProfessorApiBody(payload: ProfessorRequest): Record<string, unknown> {
    return {
        ...payload,
        grade_id: payload.professor_grade_id
    };
}
