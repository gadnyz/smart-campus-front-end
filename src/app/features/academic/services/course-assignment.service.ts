import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
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

    getByCourse(courseId: string): Observable<CourseAssignment[]> {
        return this.http.get<CourseAssignment[]>(`${this.baseUrl}/course/${courseId}`);
    }

    getByProfessor(professorId: string): Observable<CourseAssignment[]> {
        return this.http.get<CourseAssignment[]>(`${this.baseUrl}/professor/${professorId}`);
    }

    create(payload: CreateCourseAssignmentRequest): Observable<CourseAssignment> {
        return this.http.post<CourseAssignment>(this.baseUrl, payload);
    }

    update(id: string, payload: UpdateCourseAssignmentRequest): Observable<CourseAssignment> {
        return this.http.put<CourseAssignment>(`${this.baseUrl}/${id}`, payload);
    }
}