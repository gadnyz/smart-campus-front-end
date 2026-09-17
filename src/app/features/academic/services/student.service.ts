import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { environment } from '@/environments/environment';
import { Student, normalizeStudent } from '../models/student.model';
import { asList } from '../utils/academic-http';

@Injectable({ providedIn: 'root' })
export class StudentService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/students`;
    private readonly coursesUrl = `${environment.apiBaseUrl}/api/v1/courses`;

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
