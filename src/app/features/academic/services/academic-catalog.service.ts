import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, shareReplay } from 'rxjs';
import { environment } from '@/environments/environment';
import {
    AcademicYearReference,
    ApiListResponse,
    FacultyReference,
    LevelReference,
    ProgramReference,
    toContent
} from '../models/academic-reference.model';

@Injectable({ providedIn: 'root' })
export class AcademicCatalogService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = environment.apiBaseUrl;

    private faculties$?: Observable<FacultyReference[]>;
    private levels$?: Observable<LevelReference[]>;
    private programs$?: Observable<ProgramReference[]>;
    private academicYears$?: Observable<AcademicYearReference[]>;
    private readonly programsByFaculty = new Map<string, Observable<ProgramReference[]>>();

    getFaculties(): Observable<FacultyReference[]> {
        this.faculties$ ??= this.http
            .get<ApiListResponse<FacultyReference>>(`${this.baseUrl}/api/v1/faculties`, { params: this.defaultParams() })
            .pipe(map(toContent), shareReplay(1));

        return this.faculties$;
    }

    getFacultyById(id: string): Observable<FacultyReference | null> {
        return this.getFaculties().pipe(map((items) => items.find((item) => item.id === id) ?? null));
    }

    getLevels(): Observable<LevelReference[]> {
        this.levels$ ??= this.http
            .get<ApiListResponse<LevelReference>>(`${this.baseUrl}/api/v1/levels`, { params: this.defaultParams() })
            .pipe(map(toContent), shareReplay(1));

        return this.levels$;
    }

    getLevelById(id: string): Observable<LevelReference | null> {
        return this.getLevels().pipe(map((items) => items.find((item) => item.id === id) ?? null));
    }

    getPrograms(): Observable<ProgramReference[]> {
        this.programs$ ??= this.http
            .get<ApiListResponse<ProgramReference>>(`${this.baseUrl}/api/v1/programs`, { params: this.defaultParams() })
            .pipe(map(toContent), shareReplay(1));

        return this.programs$;
    }

    getProgramsByFaculty(facultyId: string): Observable<ProgramReference[]> {
        const cached = this.programsByFaculty.get(facultyId);

        if (cached) {
            return cached;
        }

        const request$ = this.http
            .get<ApiListResponse<ProgramReference>>(`${this.baseUrl}/api/v1/programs/faculty/${facultyId}`)
            .pipe(
                map(toContent),
                catchError(() => this.getPrograms().pipe(map((programs) => programs.filter((program) => program.faculty_id === facultyId)))),
                shareReplay(1)
            );

        this.programsByFaculty.set(facultyId, request$);
        return request$;
    }

    getProgramById(id: string): Observable<ProgramReference | null> {
        return this.getPrograms().pipe(map((items) => items.find((item) => item.id === id) ?? null));
    }

    getAcademicYears(): Observable<AcademicYearReference[]> {
        this.academicYears$ ??= this.http
            .get<ApiListResponse<AcademicYearReference>>(`${this.baseUrl}/api/v1/academic-years`, { params: this.defaultParams() })
            .pipe(map(toContent), shareReplay(1));

        return this.academicYears$;
    }

    getAcademicYearById(id: string): Observable<AcademicYearReference | null> {
        return this.getAcademicYears().pipe(map((items) => items.find((item) => item.id === id) ?? null));
    }

    getCurrentAcademicYear(): Observable<AcademicYearReference> {
        return this.http.get<AcademicYearReference>(`${this.baseUrl}/api/v1/academic-years/current`);
    }

    private defaultParams(): HttpParams {
        return new HttpParams().set('page', 0).set('size', 100);
    }
}