import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { AcademicPermission } from '@/app/features/academic/permissions/permission.model';

const WORKING_FACULTY_KEY = 'smartcampus.working-faculty';

/**
 * Faculté de travail de l'utilisateur connecté.
 *
 * - Portée `all` sur une ressource : il choisit une faculté, puis agit dedans ; ce choix le suit
 *   d'un écran à l'autre (`workingFacultyId`).
 * - Portée plus étroite (faculty, program, promotion, own) : il travaille dans la faculté de son
 *   compte (`users.faculty_id`), sans filtre à choisir.
 */
@Injectable({ providedIn: 'root' })
export class FacultyScopeService {
    private readonly auth = inject(AuthService);
    private readonly permissions = inject(PermissionService);

    readonly isFacultyScoped = computed(
        () =>
            this.permissions.hasPermission(AcademicPermission.FacultyReadOwn) &&
            !this.permissions.hasPermission(AcademicPermission.FacultyReadAll)
    );

    readonly facultyId = computed(() => this.auth.getCurrentUser()?.faculty_id ?? null);

    /** Faculté choisie par un utilisateur de portée `all`, gardée pour la session. */
    readonly workingFacultyId = signal<string | null>(readStored());

    /** Id à forcer sur les listes, ou `null` si rôle global. */
    scopedId(): string | null {
        return this.isFacultyScoped() ? this.facultyId() : null;
    }

    /** Limité à sa faculté pour `permission` (`academic:course:read`) : il n'a pas la portée `all`. */
    isScopedFor(permission: string): boolean {
        const scope = this.permissions.scopeOf(permission);
        return scope !== null && scope !== 'all';
    }

    /** Faculté imposée pour `permission`, ou `null` quand l'utilisateur choisit la sienne. */
    scopedIdFor(permission: string): string | null {
        return this.isScopedFor(permission) ? this.facultyId() : null;
    }

    /** Faculté de départ d'un écran : la sienne si imposée, sinon la dernière choisie. */
    initialFacultyId(permission: string): string | null {
        return this.scopedIdFor(permission) ?? this.workingFacultyId();
    }

    rememberFaculty(facultyId: string | null): void {
        this.workingFacultyId.set(facultyId);
        try {
            if (facultyId) {
                sessionStorage.setItem(WORKING_FACULTY_KEY, facultyId);
            } else {
                sessionStorage.removeItem(WORKING_FACULTY_KEY);
            }
        } catch {
            // Stockage indisponible : le choix ne vaut que pour cet écran.
        }
    }
}

function readStored(): string | null {
    try {
        return sessionStorage.getItem(WORKING_FACULTY_KEY);
    } catch {
        return null;
    }
}
