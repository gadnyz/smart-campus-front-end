import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay, tap } from 'rxjs';
import { environment } from '@/environments/environment';
import {
    CourseAssignment,
    CreateCourseAssignmentRequest,
    UpdateCourseAssignmentRequest
} from '../models/course-assignment.model';

@Injectable({ providedIn: 'root' })
export class CourseAssignmentService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/course-assignments`;
    /**
     * Affectations par cours, gardées pour toute l'application : l'horaire en demande une par cours
     * de la promotion. Créer ou modifier une affectation vide le cache ; une erreur n'est pas gardée.
     */
    private readonly byCourse = new Map<string, Observable<CourseAssignment[]>>();

    /** Affectations du professeur connecté : le serveur le déduit du jeton. */
    getMine(): Observable<CourseAssignment[]> {
        return this.http.get<CourseAssignment[]>(`${this.baseUrl}/me`);
    }

    getByCourse(courseId: string): Observable<CourseAssignment[]> {
        let cached = this.byCourse.get(courseId);
        if (!cached) {
            cached = this.http.get<CourseAssignment[]>(`${this.baseUrl}/course/${courseId}`).pipe(
                tap({ error: () => this.byCourse.delete(courseId) }),
                shareReplay({ bufferSize: 1, refCount: false })
            );
            this.byCourse.set(courseId, cached);
        }
        return cached;
    }

    getByProfessor(professorId: string): Observable<CourseAssignment[]> {
        return this.http.get<CourseAssignment[]>(`${this.baseUrl}/professor/${professorId}`);
    }

    create(payload: CreateCourseAssignmentRequest): Observable<CourseAssignment> {
        return this.http.post<CourseAssignment>(this.baseUrl, payload).pipe(tap(() => this.byCourse.clear()));
    }

    update(id: string, payload: UpdateCourseAssignmentRequest): Observable<CourseAssignment> {
        return this.http.put<CourseAssignment>(`${this.baseUrl}/${id}`, payload).pipe(tap(() => this.byCourse.clear()));
    }
}
