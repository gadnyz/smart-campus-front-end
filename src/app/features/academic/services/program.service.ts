import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@/environments/environment';
import { Program, ProgramRequest } from '../models/program.model';

@Injectable({ providedIn: 'root' })
export class ProgramService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/programs`;

    getByFaculty(facultyId: string): Observable<Program[]> {
        return this.http.get<Program[]>(`${this.baseUrl}/faculty/${facultyId}`);
    }

    create(payload: ProgramRequest): Observable<Program> {
        return this.http.post<Program>(this.baseUrl, payload);
    }

    update(id: string, payload: ProgramRequest): Observable<Program> {
        return this.http.put<Program>(`${this.baseUrl}/${id}`, payload);
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }
}