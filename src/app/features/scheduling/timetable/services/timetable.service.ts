import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '@/environments/environment';
import { PagedResponse, toPaged } from '@/app/features/academic/academic.public-api';
import {
    CreateTimetableRequest,
    Timetable,
    TimetableListQuery,
    UpdateTimetableStatusRequest,
    asTimetable
} from '../models/timetable.model';

@Injectable({ providedIn: 'root' })
export class TimetableService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/timetables`;

    list(query: TimetableListQuery = {}): Observable<PagedResponse<Timetable>> {
        return this.http.get<unknown>(this.baseUrl, { params: this.toParams(query) }).pipe(map((body) => toPaged(body, asTimetable)));
    }

    getById(id: string): Observable<Timetable> {
        return this.http.get<unknown>(`${this.baseUrl}/${id}`).pipe(map(asTimetable));
    }

    create(payload: CreateTimetableRequest): Observable<Timetable> {
        return this.http.post<unknown>(this.baseUrl, payload).pipe(map(asTimetable));
    }

    changeStatus(id: string, payload: UpdateTimetableStatusRequest): Observable<Timetable> {
        return this.http.patch<unknown>(`${this.baseUrl}/${id}/status`, payload).pipe(map(asTimetable));
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }

    private toParams(query: TimetableListQuery): HttpParams {
        let params = new HttpParams();
        const entries: [string, string | number | undefined][] = [
            ['academicYearId', query.academicYearId],
            ['facultyId', query.facultyId],
            ['programId', query.programId],
            ['programLevelId', query.programLevelId],
            ['week', query.week],
            ['status', query.status],
            ['page', query.page],
            ['size', query.size]
        ];
        for (const [key, value] of entries) {
            if (value !== undefined && value !== '') {
                params = params.set(key, String(value));
            }
        }
        for (const sort of query.sort ?? []) {
            params = params.append('sort', sort);
        }
        return params;
    }
}