import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { environment } from '@/environments/environment';
import { PagedResponse } from '../models/academic-reference.model';
import { Student, StudentQuery, StudentRequest, normalizeStudent } from '../models/student.model';
import { asList } from '../utils/academic-http';
import { toPaged } from '../utils/academic-page';

@Injectable({ providedIn: 'root' })
export class StudentService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/students`;
    private readonly coursesUrl = `${environment.apiBaseUrl}/api/v1/courses`;

    getAll(query: StudentQuery = {}): Observable<PagedResponse<Student>> {
        let params = new HttpParams()
            .set('page', query.page ?? 0)
            .set('size', query.size ?? 10);

        if (query.gender) {
            params = params.set('gender', query.gender);
        }

        if (query.facultyId) {
            params = params.set('faculty_id', query.facultyId);
        }

        if (query.programId) {
            params = params.set('program_id', query.programId);
        }

        if (query.levelId) {
            params = params.set('level_id', query.levelId);
        }

        if (query.nationality?.trim()) {
            params = params.set('nationality', query.nationality.trim());
        }

        if (query.matricule?.trim()) {
            params = params.set('matricule', query.matricule.trim());
        }

        if (query.q?.trim()) {
            params = params.set('q', query.q.trim());
        }

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

    getByCourse(courseId: string): Observable<Student[]> {
        return this.requestStudents(`${this.baseUrl}/course/${courseId}`).pipe(
            catchError((error: { status?: number }) => {
                if (error.status !== 404 && error.status !== 405) {
                    return throwError(() => error);
                }

                return this.requestStudents(`${this.coursesUrl}/${courseId}/students`).pipe(
                    catchError((fallbackError: { status?: number }) => {
                        if (fallbackError.status === 404 || fallbackError.status === 405) {
                            return of([]);
                        }

                        return throwError(() => fallbackError);
                    })
                );
            })
        );
    }

    private requestStudents(url: string): Observable<Student[]> {
        const params = new HttpParams().set('page', 0).set('size', 100);
        return this.http
            .get<unknown>(url, { params })
            .pipe(map((body) => asList(body).map(normalizeStudent)));
    }
}
