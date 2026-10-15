import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, shareReplay } from 'rxjs';
import { ProfessorService } from '@/app/features/academic/academic.public-api';

/** Nom affiché d'un enseignant : code du grade, prénom, nom (ex. « PO Ada Lovelace »). */
export function professorLabel(professor: { professor_grade_code?: string; first_name: string; last_name: string }): string {
    return [professor.professor_grade_code, professor.first_name, professor.last_name].filter(Boolean).join(' ');
}

/**
 * Libellés des enseignants avec leur grade, par identifiant. Les séances ne portent que
 * « Prénom Nom » : l'annuaire est chargé une fois pour toute la session et partagé par les
 * calendriers. En cas d'échec, la carte est vide et le nom de la séance reste affiché.
 */
@Injectable({ providedIn: 'root' })
export class ProfessorLabelService {
    private readonly professorService = inject(ProfessorService);
    private labels$?: Observable<Map<string, string>>;

    labels(): Observable<Map<string, string>> {
        this.labels$ ??= this.professorService.getAll().pipe(
            map((professors) => new Map(professors.map((professor) => [professor.id, professorLabel(professor)]))),
            catchError(() => of(new Map<string, string>())),
            shareReplay(1)
        );
        return this.labels$;
    }
}
