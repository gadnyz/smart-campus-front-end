import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@/environments/environment';
import { ProfessorGrade, ProfessorGradeRequest } from '../models/professor-grade.model';

@Injectable({ providedIn: 'root' })
export class ProfessorGradeService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/professor-grades`;

    getAll(): Observable<ProfessorGrade[]> {
        return this.http.get<ProfessorGrade[]>(this.baseUrl);
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