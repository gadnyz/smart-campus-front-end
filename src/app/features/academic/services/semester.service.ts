import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@/environments/environment';
import { Semester, SemesterRequest } from '../models/semester.model';

@Injectable({ providedIn: 'root' })
export class SemesterService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/semesters`;

    getAll(): Observable<Semester[]> {
        return this.http.get<Semester[]>(this.baseUrl);
    }

    getByAcademicYear(academicYearId: string): Observable<Semester[]> {
        return this.http.get<Semester[]>(`${this.baseUrl}/academic-year/${academicYearId}`);
    }

    create(payload: SemesterRequest): Observable<Semester> {
        return this.http.post<Semester>(this.baseUrl, payload);
    }

    update(id: string, payload: SemesterRequest): Observable<Semester> {
        return this.http.put<Semester>(`${this.baseUrl}/${id}`, payload);
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }
}