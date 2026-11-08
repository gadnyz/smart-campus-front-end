import { HttpClient } from '@angular/common/http';
import { toApiParams } from '@/app/shared/http/api-params';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '@/environments/environment';
import { PagedResponse } from '../models/academic-reference.model';
import { Student, StudentQuery, StudentRequest, normalizeStudent } from '../models/student.model';
import { toPaged } from '../utils/academic-page';

@Injectable({ providedIn: 'root' })
export class StudentService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/students`;

    getAll(query: StudentQuery = {}): Observable<PagedResponse<Student>> {
        const params = toApiParams({
            faculty_id: query.facultyId,
            program_id: query.programId,
            program_level_id: query.programLevelId,
            academic_year_id: query.academicYearId,
            search: query.search,
            page: query.page ?? 0,
            size: query.size ?? 10
        });
        return this.http
            .get<unknown>(this.baseUrl, { params })
            .pipe(map((body) => toPaged(body, normalizeStudent)));
    }

    getById(id: string): Observable<Student> {
        return this.http.get<unknown>(`${this.baseUrl}/${id}`).pipe(map(normalizeStudent));
    }

    update(id: string, payload: StudentRequest): Observable<Student> {
        return this.http.put<unknown>(`${this.baseUrl}/${id}`, payload).pipe(map(normalizeStudent));
    }

    /**
     * Étudiants d'une promotion (année active). L'API n'expose pas les inscrits d'un cours :
     * ce sont ceux des promotions auxquelles le cours est enseigné.
     */
    getByProgramLevel(programLevelId: string, size = 100): Observable<PagedResponse<Student>> {
        return this.getAll({ programLevelId, page: 0, size });
    }
}
