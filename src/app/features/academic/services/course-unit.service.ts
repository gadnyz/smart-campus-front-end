import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@/environments/environment';
import { CourseUnit, CourseUnitRequest, KnowledgeSkillsBloc } from '../models/course-unit.model';

@Injectable({ providedIn: 'root' })
export class CourseUnitService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/course-units`;

    getByFaculty(facultyId: string, knowledgeSkillsBloc?: KnowledgeSkillsBloc): Observable<CourseUnit[]> {
        let params = new HttpParams();

        if (knowledgeSkillsBloc) {
            params = params.set('knowledgeSkillsBloc', knowledgeSkillsBloc);
        }

        return this.http.get<CourseUnit[]>(`${this.baseUrl}/faculty/${facultyId}`, { params });
    }

    getById(id: string): Observable<CourseUnit> {
        return this.http.get<CourseUnit>(`${this.baseUrl}/${id}`);
    }

    create(payload: CourseUnitRequest): Observable<CourseUnit> {
        return this.http.post<CourseUnit>(this.baseUrl, payload);
    }

    update(id: string, payload: CourseUnitRequest): Observable<CourseUnit> {
        return this.http.put<CourseUnit>(`${this.baseUrl}/${id}`, payload);
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }
}