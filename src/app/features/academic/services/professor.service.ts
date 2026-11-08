import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, catchError, expand, map, reduce } from 'rxjs';
import { environment } from '@/environments/environment';
import { toApiParams } from '@/app/shared/http/api-params';
import { PagedResponse } from '../models/academic-reference.model';
import { Professor, ProfessorRequest, normalizeProfessor } from '../models/professor.model';
import { toPaged } from '../utils/academic-page';

/** Plafond de l'API : au plus 100 professeurs par page. */
const MAX_PAGE_SIZE = 100;

export interface ProfessorQuery {
    facultyId?: string | null;
    professorGradeId?: string | null;
    /** Début du matricule, du prénom, du nom ou du post-nom. */
    search?: string | null;
    page?: number;
    size?: number;
    sort?: string[];
}

@Injectable({ providedIn: 'root' })
export class ProfessorService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/professors`;

    /** Une page de `GET /professors`, filtrée par faculté d'attache, grade ou recherche. */
    list(query: ProfessorQuery = {}): Observable<PagedResponse<Professor>> {
        return this.http
            .get<unknown>(this.baseUrl, {
                params: toApiParams({
                    faculty_id: query.facultyId,
                    professor_grade_id: query.professorGradeId,
                    search: query.search,
                    page: query.page ?? 0,
                    size: query.size ?? 20,
                    sort: query.sort ?? []
                })
            })
            .pipe(map((body) => toPaged(body, normalizeProfessor)));
    }

    /** Tous les professeurs visibles, page après page. */
    getAll(query: Omit<ProfessorQuery, 'page' | 'size'> = {}): Observable<Professor[]> {
        const fetch = (page: number) => this.list({ sort: ['last_name,asc'], ...query, page, size: MAX_PAGE_SIZE });
        return fetch(0).pipe(
            expand((current) => (current.page + 1 < current.total_pages ? fetch(current.page + 1) : EMPTY)),
            reduce((all, page) => [...all, ...page.content], [] as Professor[])
        );
    }

    getById(id: string): Observable<Professor> {
        return this.http.get<unknown>(`${this.baseUrl}/${id}`).pipe(map(normalizeProfessor));
    }

    getByFaculty(facultyId: string): Observable<Professor[]> {
        return this.getAll({ facultyId });
    }

    getByGrade(gradeId: string): Observable<Professor[]> {
        return this.getAll({ professorGradeId: gradeId });
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
        return this.http.post<unknown>(this.baseUrl, toProfessorApiBody(payload, true)).pipe(map(normalizeProfessor));
    }

    update(id: string, payload: ProfessorRequest): Observable<Professor> {
        return this.http.put<unknown>(`${this.baseUrl}/${id}`, toProfessorApiBody(payload, false)).pipe(map(normalizeProfessor));
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }
}

/**
 * Corps de `CreateProfessorRequest` / `UpdateProfessorRequest` : le matricule et le compte sont
 * attribués par le backend, et l'email ne se modifie pas.
 */
function toProfessorApiBody(payload: ProfessorRequest, withEmail: boolean): Record<string, unknown> {
    return {
        faculty_id: payload.faculty_id,
        professor_grade_id: payload.professor_grade_id,
        first_name: payload.first_name,
        last_name: payload.last_name,
        middle_name: payload.middle_name ?? null,
        gender: payload.gender ?? null,
        birth_date: payload.birth_date ?? null,
        birth_place: payload.birth_place ?? null,
        marital_status: payload.marital_status ?? null,
        nationality: payload.nationality ?? null,
        phone: payload.phone ?? null,
        ...(withEmail ? { email: payload.email ?? null } : {})
    };
}
