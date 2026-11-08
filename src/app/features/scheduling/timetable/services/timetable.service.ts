import { HttpClient, HttpParams } from '@angular/common/http';
import { toApiParams } from '@/app/shared/http/api-params';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '@/environments/environment';
import { PagedResponse, asList, toPaged } from '@/app/features/academic/academic.public-api';
import { StudentTimetableEntry, asStudentTimetableEntry } from '../models/timetable-view.model';
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

    /**
     * Semaine de l'étudiant connecté : le backend retrouve sa promotion et ne renvoie qu'un
     * horaire VALIDATED (404 sinon).
     */
    getOwnWeek(referenceDate: string): Observable<StudentTimetableEntry[]> {
        return this.http
            .get<unknown>(`${this.baseUrl}/me/week`, { params: toApiParams({ reference_date: referenceDate }) })
            .pipe(map((body) => asList<unknown>(body).map(asStudentTimetableEntry)));
    }

    getById(id: string): Observable<Timetable> {
        return this.http.get<unknown>(`${this.baseUrl}/${id}`).pipe(map(asTimetable));
    }

    create(payload: CreateTimetableRequest): Observable<Timetable> {
        return this.http.post<unknown>(this.baseUrl, payload).pipe(map(asTimetable));
    }

    /**
     * Copie une semaine vers une autre, tout ou rien : un horaire DRAFT est créé pour la semaine
     * cible avec toutes les séances décalées. Sur 422, rien n'est créé et les séances refusées sont
     * listées par leur position dans la semaine source (triée par date puis heure de début).
     */
    duplicate(id: string, targetWeekStart: string): Observable<Timetable> {
        return this.http.post<unknown>(`${this.baseUrl}/${id}/duplicate`, { target_week_start: targetWeekStart }).pipe(map(asTimetable));
    }

    changeStatus(id: string, payload: UpdateTimetableStatusRequest): Observable<Timetable> {
        return this.http.patch<unknown>(`${this.baseUrl}/${id}/status`, payload).pipe(map(asTimetable));
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }

    private toParams(query: TimetableListQuery): HttpParams {
        return toApiParams({
            academic_year_id: query.academicYearId,
            faculty_id: query.facultyId,
            program_id: query.programId,
            program_level_id: query.programLevelId,
            week: query.week,
            status: query.status,
            page: query.page,
            size: query.size,
            sort: query.sort ?? []
        });
    }
}