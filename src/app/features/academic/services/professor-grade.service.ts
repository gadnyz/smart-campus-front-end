import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '@/environments/environment';
import { ProfessorGrade, ProfessorGradeRequest } from '../models/professor-grade.model';
import { asList } from '../utils/academic-http';

@Injectable({ providedIn: 'root' })
export class ProfessorGradeService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/professor-grades`;

    getAll(): Observable<ProfessorGrade[]> {
        const params = new HttpParams().set('page', 0).set('size', 100);
        return this.http.get<unknown>(this.baseUrl, { params }).pipe(map((body) => asList(body)));
    }

    create(payload: ProfessorGradeRequest): Observable<ProfessorGrade> {
        return this.http.post<ProfessorGrade>(this.baseUrl, payload);
    }

    update(id: string, payload: ProfessorGradeRequest): Observable<ProfessorGrade> {
        return this.http.put<ProfessorGrade>(`${this.baseUrl}/${id}`, payload);
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }
}
