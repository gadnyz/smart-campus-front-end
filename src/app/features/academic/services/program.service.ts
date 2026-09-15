import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, switchMap } from 'rxjs';
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
        const meta = {
            code: payload.code,
            name: payload.name,
            faculty_id: payload.faculty_id
        };

        // Hibernate insert-before-delete on program_levels: clear first, then insert the desired list.
        return this.http.put<Program>(`${this.baseUrl}/${id}`, meta).pipe(
            switchMap(() =>
                this.http.put<Program>(`${this.baseUrl}/${id}`, {
                    ...meta,
                    levels: payload.levels ?? []
                })
            )
        );
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }

    getAll(): Observable<Program[]> {
        return this.http.get<Program[]>(this.baseUrl);
    }
}