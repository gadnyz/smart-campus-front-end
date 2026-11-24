import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay, switchMap, tap } from 'rxjs';
import { environment } from '@/environments/environment';
import { Program, ProgramRequest } from '../models/program.model';

@Injectable({ providedIn: 'root' })
export class ProgramService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/programs`;
    /**
     * Programmes par faculté, gardés d'un écran à l'autre : `GET /programs/faculty/{id}` est lent
     * côté serveur (1,6 s mesurées). Toute écriture vide le cache ; une erreur n'est pas gardée.
     */
    private readonly byFaculty = new Map<string, Observable<Program[]>>();

    getByFaculty(facultyId: string): Observable<Program[]> {
        let cached = this.byFaculty.get(facultyId);
        if (!cached) {
            cached = this.http.get<Program[]>(`${this.baseUrl}/faculty/${facultyId}`).pipe(
                tap({ error: () => this.byFaculty.delete(facultyId) }),
                shareReplay({ bufferSize: 1, refCount: false })
            );
            this.byFaculty.set(facultyId, cached);
        }
        return cached;
    }

    create(payload: ProgramRequest): Observable<Program> {
        return this.http.post<Program>(this.baseUrl, payload).pipe(tap(() => this.clearCache()));
    }

    update(id: string, payload: ProgramRequest): Observable<Program> {
        const meta = {
            code: payload.code,
            name: payload.name,
            faculty_id: payload.faculty_id
        };

        // Hibernate insert-before-delete on program_levels: clear first, then insert the desired list.
        return this.http
            .put<Program>(`${this.baseUrl}/${id}`, meta)
            .pipe(
                switchMap(() =>
                    this.http.put<Program>(`${this.baseUrl}/${id}`, {
                        ...meta,
                        levels: payload.levels ?? []
                    })
                )
            )
            .pipe(tap({ finalize: () => this.clearCache() }));
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(tap(() => this.clearCache()));
    }

    getAll(): Observable<Program[]> {
        return this.http.get<Program[]>(this.baseUrl);
    }

    /** Après une écriture, la prochaine lecture repart du serveur. */
    clearCache(): void {
        this.byFaculty.clear();
    }
}
