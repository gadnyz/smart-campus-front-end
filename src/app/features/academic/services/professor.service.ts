import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@/environments/environment';
import { Professor } from '../models/professor.model';

@Injectable({ providedIn: 'root' })
export class ProfessorService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/professors`;

    getAll(): Observable<Professor[]> {
        return this.http.get<Professor[]>(this.baseUrl);
    }

    getByFaculty(facultyId: string): Observable<Professor[]> {
        return this.http.get<Professor[]>(`${this.baseUrl}/faculty/${facultyId}`);
    }
}