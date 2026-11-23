import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { UsersService } from '@/app/features/identity/users/services/user.service';
import { FacultyService } from './faculty.service';
import { readableApiText } from '@/app/shared/http/readable-api-text';

/** Profil métier qui porte les droits du secrétaire académique de faculté. */
export const SAF_PROFILE_NAME = 'ACADEMIC_SECRETARY';

/** Ce que la synchronisation a changé sur le compte, pour le dire à l'utilisateur. */
export interface SafProfileSync {
    profileAdded?: boolean;
    profileRemoved?: boolean;
    facultyAligned?: boolean;
    /** Étape refusée par le serveur : la nomination elle-même reste faite. */
    failure?: string;
}

/**
 * La fonction SAF (direction de faculté) ne donne aucun droit côté serveur : le profil
 * ACADEMIC_SECRETARY les porte. Nommer un SAF lui attribue donc ce profil et le rattache à la
 * faculté (sa portée « faculty » se lit sur son compte) ; le révoquer le lui retire, sauf s'il
 * reste SAF d'une autre faculté.
 */
@Injectable({ providedIn: 'root' })
export class SafProfileSyncService {
    private readonly usersService = inject(UsersService);
    private readonly facultyService = inject(FacultyService);

    afterAssign(userId: string, facultyId: string): Observable<SafProfileSync> {
        return forkJoin({ user: this.usersService.getUserById(userId), profileId: this.safProfileId() }).pipe(
            switchMap(({ user, profileId }) => {
                const steps: Observable<Partial<SafProfileSync>>[] = [];
                if (!(user.profiles ?? []).includes(SAF_PROFILE_NAME)) {
                    if (!profileId) {
                        return of({ failure: `profil ${SAF_PROFILE_NAME} introuvable` });
                    }
                    steps.push(this.usersService.assignProfile(userId, profileId).pipe(map(() => ({ profileAdded: true }))));
                }
                if (user.faculty_id !== facultyId) {
                    steps.push(
                        this.usersService
                            .updateUser(userId, { username: user.username, email: user.email, faculty_id: facultyId })
                            .pipe(map(() => ({ facultyAligned: true })))
                    );
                }
                return steps.length ? forkJoin(steps).pipe(map((parts) => Object.assign({}, ...parts) as SafProfileSync)) : of({});
            }),
            catchError((error: { error?: { detail?: string } }) => of({ failure: readableApiText(error?.error?.detail ?? '') || 'mise à jour du compte refusée' }))
        );
    }

    afterRevoke(userId: string, facultyId: string): Observable<SafProfileSync> {
        return forkJoin({ user: this.usersService.getUserById(userId), profileId: this.safProfileId(), elsewhere: this.isSafElsewhere(userId, facultyId) }).pipe(
            switchMap(({ user, profileId, elsewhere }) => {
                if (elsewhere || !profileId || !(user.profiles ?? []).includes(SAF_PROFILE_NAME)) {
                    return of({});
                }
                return this.usersService.removeProfile(userId, profileId).pipe(map(() => ({ profileRemoved: true })));
            }),
            catchError((error: { error?: { detail?: string } }) => of({ failure: readableApiText(error?.error?.detail ?? '') || 'mise à jour du compte refusée' }))
        );
    }

    private safProfileId(): Observable<string | null> {
        return this.usersService.getProfiles().pipe(map((page) => (page.content ?? []).find((profile) => profile.name === SAF_PROFILE_NAME)?.id ?? null));
    }

    /** Encore SAF actif d'une autre faculté ? */
    private isSafElsewhere(userId: string, facultyId: string): Observable<boolean> {
        return this.facultyService.getAll().pipe(
            switchMap((faculties) => {
                const others = faculties.filter((faculty) => faculty.id !== facultyId);
                if (!others.length) {
                    return of(false);
                }
                return forkJoin(others.map((faculty) => this.facultyService.getLeadership(faculty.id).pipe(catchError(() => of([]))))).pipe(
                    map((groups) => groups.flat().some((item) => item.user_id === userId && item.role === 'SAF' && item.active !== false))
                );
            })
        );
    }
}
