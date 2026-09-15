import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '@/environments/environment';
import { Course, CourseRequest } from '../models/course.model';

@Injectable({ providedIn: 'root' })
export class CourseService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/courses`;

    getAll(): Observable<Course[]> {
        return this.http.get<Course[]>(this.baseUrl);
    }

    findById(id: string): Observable<Course | null> {
        return this.getAll().pipe(map((courses) => courses.find((course) => course.id === id) ?? null));
    }

    create(payload: CourseRequest): Observable<Course> {
        return this.http.post<Course>(this.baseUrl, payload);
    }

    update(id: string, payload: CourseRequest): Observable<Course> {
        return this.http.put<Course>(`${this.baseUrl}/${id}`, payload);
    }

    getByProgramLevel(programLevelId: string): Observable<Course[]> {
        return this.http.get<Course[]>(`${this.baseUrl}/program-level/${programLevelId}`);
    }
}