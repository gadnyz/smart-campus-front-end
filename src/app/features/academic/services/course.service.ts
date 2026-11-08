import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, expand, map, reduce, takeWhile } from 'rxjs';
import { environment } from '@/environments/environment';
import { toApiParams } from '@/app/shared/http/api-params';
import { PagedResponse } from '../models/academic-reference.model';
import { Course, CourseQuery, CreateCourseRequest, UpdateCourseRequest } from '../models/course.model';

/** Plafond de l'API : au plus 100 cours par page. */
const MAX_PAGE_SIZE = 100;

@Injectable({ providedIn: 'root' })
export class CourseService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/courses`;

    /** Une page de cours, filtrée par faculté et recherche (début du code ou du nom). */
    list(query: CourseQuery = {}): Observable<PagedResponse<Course>> {
        return this.http.get<PagedResponse<Course>>(this.baseUrl, {
            params: toApiParams({
                faculty_id: query.facultyId,
                search: query.search,
                page: query.page ?? 0,
                size: query.size ?? 20,
                sort: query.sort ?? []
            })
        });
    }

    /** Tous les cours visibles, page après page (pour les listes de choix). */
    getAll(facultyId?: string | null): Observable<Course[]> {
        return this.pages({ facultyId, sort: ['code,asc'] }).pipe(reduce((all, page) => [...all, ...page.content], [] as Course[]));
    }

    /**
     * L'API n'expose pas `GET /courses/{id}` : le cours est cherché dans les pages, en
     * s'arrêtant dès qu'il est trouvé.
     */
    findById(id: string): Observable<Course | null> {
        return this.pages({ sort: ['code,asc'] }).pipe(
            map((page) => page.content.find((course) => course.id === id) ?? null),
            takeWhile((found) => found === null, true),
            reduce((found: Course | null, current) => found ?? current, null)
        );
    }

    create(payload: CreateCourseRequest): Observable<Course> {
        return this.http.post<Course>(this.baseUrl, payload);
    }

    update(id: string, payload: UpdateCourseRequest): Observable<Course> {
        return this.http.put<Course>(`${this.baseUrl}/${id}`, payload);
    }

    getByProgramLevel(programLevelId: string): Observable<Course[]> {
        return this.http.get<Course[]>(`${this.baseUrl}/program-level/${programLevelId}`);
    }

    private pages(query: CourseQuery): Observable<PagedResponse<Course>> {
        const fetch = (page: number) => this.list({ ...query, page, size: MAX_PAGE_SIZE });
        return fetch(0).pipe(expand((current) => (current.page + 1 < current.total_pages ? fetch(current.page + 1) : EMPTY)));
    }
}
