import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@/environments/environment';
import { AcademicYear, CreateAcademicYearRequest } from '../models/academic-year.model';

@Injectable({ providedIn: 'root' })
export class AcademicYearService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/academic-years`;

    getAll(): Observable<AcademicYear[]> {
        return this.http.get<AcademicYear[]>(this.baseUrl);
    }

    getCurrent(): Observable<AcademicYear> {
        return this.http.get<AcademicYear>(`${this.baseUrl}/current`);
    }

    create(payload: CreateAcademicYearRequest): Observable<AcademicYear> {
        return this.http.post<AcademicYear>(this.baseUrl, payload);
    }

    activate(academicYearId: string): Observable<AcademicYear> {
        return this.http.patch<AcademicYear>(`${this.baseUrl}/${academicYearId}/activate`, {});
    }

    close(academicYearId: string): Observable<AcademicYear> {
        return this.http.patch<AcademicYear>(`${this.baseUrl}/${academicYearId}/close`, {});
    }
}