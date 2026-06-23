import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { AcademicCatalogService, AcademicReference } from '@/app/features/academic/academic.public-api';
import { CandidateResponse } from '../models/candidate.model';

export type SelectOption = {
    label: string;
    value: string;
};

export interface CandidateAcademicLabels {
    academicYearLabel: string;
    facultyLabel: string;
    programLabel: string;
    levelLabel: string;
}

@Injectable({ providedIn: 'root' })
export class AdmissionAcademicReferenceService {
    private readonly academicCatalogService = inject(AcademicCatalogService);

    getFacultyOptions(): Observable<SelectOption[]> {
        return this.academicCatalogService.getFaculties().pipe(map((items) => items.map((item) => this.toOption(item))));
    }

    getLevelOptions(): Observable<SelectOption[]> {
        return this.academicCatalogService.getLevels().pipe(map((items) => items.map((item) => this.toOption(item))));
    }

    getProgramOptionsByFaculty(facultyId: string): Observable<SelectOption[]> {
        return this.academicCatalogService.getProgramsByFaculty(facultyId).pipe(map((items) => items.map((item) => this.toOption(item))));
    }

    resolveCandidateLabels(candidate: CandidateResponse): Observable<CandidateAcademicLabels> {
        return forkJoin({
            academicYear: this.academicCatalogService.getAcademicYearById(candidate.academic_year_id).pipe(catchError(() => of(null))),
            faculty: this.academicCatalogService.getFacultyById(candidate.faculty_id).pipe(catchError(() => of(null))),
            program: this.academicCatalogService.getProgramById(candidate.program_id).pipe(catchError(() => of(null))),
            level: this.academicCatalogService.getLevelById(candidate.level_id).pipe(catchError(() => of(null)))
        }).pipe(
            map(({ academicYear, faculty, program, level }) => ({
                academicYearLabel: academicYear?.label ?? candidate.academic_year_id,
                facultyLabel: this.labelOf(faculty, candidate.faculty_id),
                programLabel: this.labelOf(program, candidate.program_id),
                levelLabel: this.labelOf(level, candidate.level_id)
            }))
        );
    }

    private toOption(item: AcademicReference): SelectOption {
        return {
            label: item.code ? `${item.code} - ${item.name}` : item.name,
            value: item.id
        };
    }

    private labelOf(item: AcademicReference | null, fallback: string): string {
        if (!item) {
            return fallback;
        }

        return item.code ? `${item.code} - ${item.name}` : item.name;
    }
}