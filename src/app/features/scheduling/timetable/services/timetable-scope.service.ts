import { Injectable, inject } from '@angular/core';
import { AuthService } from '@/app/core/auth/services/auth.service';

/**
 * Profils connus du backend (`ProfileType`) qui changent ce que montre la planification.
 * Le SAF (secrétaire académique de faculté) est le profil `ACADEMIC_SECRETARY`, rattaché à sa
 * faculté par `users.faculty_id`.
 */
const ADMIN = 'ADMIN';
const ACADEMIC_SECRETARY = 'ACADEMIC_SECRETARY';
const STUDENT = 'STUDENT';
const PROFESSOR = 'PROFESSOR';

export type PersonalTimetableKind = 'student' | 'professor';

/** Filtre de liste pour une portée faculté : vide quand l'utilisateur voit toutes les facultés. */
export function scopeQuery(facultyId: string | null): { facultyId?: string } {
    return facultyId ? { facultyId } : {};
}

/**
 * Portée des horaires pour l'utilisateur connecté.
 *
 * <p>Attention : c'est un filtre d'affichage. Tant que le backend n'a pas de portée
 * `:faculty`, un SAF qui détient les droits `:all` peut lire les autres facultés par l'API ;
 * seul le serveur peut réellement cloisonner.
 */
@Injectable({ providedIn: 'root' })
export class TimetableScopeService {
    private readonly authService = inject(AuthService);

    /** Faculté à laquelle limiter les horaires, ou `null` quand l'utilisateur les voit tous. */
    facultyId(): string | null {
        const user = this.authService.getCurrentUser();
        const profiles = user?.profiles ?? [];
        if (profiles.includes(ADMIN) || !profiles.includes(ACADEMIC_SECRETARY)) {
            return null;
        }
        return user?.faculty_id ?? null;
    }

    /** SAF sans faculté renseignée : il ne doit rien voir plutôt que tout voir. */
    facultyMissing(): boolean {
        const user = this.authService.getCurrentUser();
        const profiles = user?.profiles ?? [];
        return !profiles.includes(ADMIN) && profiles.includes(ACADEMIC_SECRETARY) && !user?.faculty_id;
    }

    /** Emploi du temps personnel : celui d'un professeur prime s'il est aussi étudiant. */
    personalKind(): PersonalTimetableKind | null {
        const profiles = this.authService.getCurrentUser()?.profiles ?? [];
        if (profiles.includes(PROFESSOR)) {
            return 'professor';
        }
        return profiles.includes(STUDENT) ? 'student' : null;
    }
}
