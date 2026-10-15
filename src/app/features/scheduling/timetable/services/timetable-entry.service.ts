import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, throwError } from 'rxjs';
import { environment } from '@/environments/environment';
import { asList } from '@/app/features/academic/academic.public-api';
import {
    CreateTimetableEntryRequest,
    TimetableEntry,
    UpdateTimetableEntryRequest,
    asTimetableEntry
} from '../models/timetable-entry.model';

@Injectable({ providedIn: 'root' })
export class TimetableEntryService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/timetable-entries`;

    create(payload: CreateTimetableEntryRequest): Observable<TimetableEntry[]> {
        if (!payload.timetable_id) {
            return throwError(() => new Error('Un créneau exige un horaire déjà créé.'));
        }
        return this.http.post<unknown>(this.baseUrl, payload).pipe(map((body) => asList<unknown>(body).map(asTimetableEntry)));
    }

    update(id: string, payload: UpdateTimetableEntryRequest): Observable<TimetableEntry> {
        return this.http.put<unknown>(`${this.baseUrl}/${id}`, payload).pipe(map(asTimetableEntry));
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }

    /** Séances de la semaine (lundi → dimanche) contenant `referenceDate`. */
    getForWeek(timetableId: string, referenceDate: string): Observable<TimetableEntry[]> {
        return this.http
            .get<unknown>(`${this.baseUrl}/timetable/${timetableId}/week`, { params: { referenceDate } })
            .pipe(map((body) => asList<unknown>(body).map(asTimetableEntry)));
    }

    /** Toutes les séances d'une affectation (un cours donné par un professeur), tous horaires confondus. */
    getByCourseAssignment(courseAssignmentId: string): Observable<TimetableEntry[]> {
        return this.http
            .get<unknown>(`${this.baseUrl}/course-assignment/${courseAssignmentId}`)
            .pipe(map((body) => asList<unknown>(body).map(asTimetableEntry)));
    }

    getByTimetable(timetableId: string): Observable<TimetableEntry[]> {
        return this.http.get<unknown>(`${this.baseUrl}/timetable/${timetableId}`).pipe(map((body) => asList<unknown>(body).map(asTimetableEntry)));
    }
}