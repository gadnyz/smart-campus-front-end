import { Injectable, inject } from '@angular/core';
import { AuthService } from '@/app/core/auth/services/auth.service';
import { PermissionService } from '@/app/core/permissions/permission.service';

/** Lire les horaires : la portée `all` choisit sa faculté, une portée plus étroite garde la sienne. */
const TIMETABLE_READ = 'scheduling:timetable:read';

/** Profils qui ont un emploi du temps personnel. */
const STUDENT = 'STUDENT';
const PROFESSOR = 'PROFESSOR';

export type PersonalTimetableKind = 'student' | 'professor';

/** Filtre de liste pour une portée faculté : vide quand l'utilisateur voit toutes les facultés. */
export function scopeQuery(facultyId: string | null): { facultyId?: string } {
    return facultyId ? { facultyId } : {};
}

/**
 * Portée des horaires pour l'utilisateur connecté, lue sur ses privilèges : avec
 * `scheduling:timetable:read:all` il voit toutes les facultés, avec une portée plus étroite
 * (`faculty`…) celle de son compte (`users.faculty_id`). Le serveur cloisonne de son côté.
 */
@Injectable({ providedIn: 'root' })
export class TimetableScopeService {
    private readonly authService = inject(AuthService);
    private readonly permissionService = inject(PermissionService);

    /** Faculté à laquelle limiter les horaires, ou `null` quand l'utilisateur les voit tous. */
    facultyId(): string | null {
        return this.isScoped() ? (this.authService.getCurrentUser()?.faculty_id ?? null) : null;
    }

    /** Portée faculté sans faculté renseignée : il ne doit rien voir plutôt que tout voir. */
    facultyMissing(): boolean {
        return this.isScoped() && !this.authService.getCurrentUser()?.faculty_id;
    }

    /** Emploi du temps personnel : celui d'un professeur prime s'il est aussi étudiant. */
    personalKind(): PersonalTimetableKind | null {
        const profiles = this.authService.getCurrentUser()?.profiles ?? [];
        if (profiles.includes(PROFESSOR)) {
            return 'professor';
        }
        return profiles.includes(STUDENT) ? 'student' : null;
    }

    private isScoped(): boolean {
        const scope = this.permissionService.scopeOf(TIMETABLE_READ);
        return scope !== null && scope !== 'all';
    }
}
