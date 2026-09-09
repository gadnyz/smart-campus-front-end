import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@/environments/environment';
import { Level, LevelRequest } from '../models/level.model';

@Injectable({ providedIn: 'root' })
export class LevelService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/levels`;

    getAll(): Observable<Level[]> {
        return this.http.get<Level[]>(this.baseUrl);
    }

    create(payload: LevelRequest): Observable<Level> {
        return this.http.post<Level>(this.baseUrl, payload);
    }

    update(id: string, payload: LevelRequest): Observable<Level> {
        return this.http.put<Level>(`${this.baseUrl}/${id}`, payload);
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }
}