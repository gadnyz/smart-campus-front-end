import { DestroyRef, signal } from '@angular/core';
import { Observable, Subscription, catchError, forkJoin, map, of, tap } from 'rxjs';
import { isSignedUrlExpiredOrExpiring } from '@/app/shared/utils/signed-url';
import { CandidateDocument } from '../../models/candidate.model';

/**
 * URL signées des documents d'un dossier : chargement initial, puis renouvellement à
 * l'expiration (au plus deux fois par document). Seule la route change selon la page :
 * celle du personnel pour le détail, `/candidates/me/...` pour le candidat.
 */
export class DossierDocumentUrls {
    private static readonly MAX_REFRESHES = 2;

    readonly urls = signal<Record<string, string>>({});
    private readonly attempts = new Map<string, number>();
    private loading?: Subscription;

    constructor(
        private readonly resolve: (document: CandidateDocument) => Observable<string>,
        destroyRef: DestroyRef
    ) {
        destroyRef.onDestroy(() => this.loading?.unsubscribe());
    }

    url(document: CandidateDocument): string {
        return this.urls()[document.id] ?? '';
    }

    load(documents: readonly CandidateDocument[]): void {
        this.loading?.unsubscribe();
        this.attempts.clear();
        if (!documents.length) {
            this.urls.set({});
            return;
        }
        this.loading = forkJoin(
            documents.map((document) =>
                this.resolve(document).pipe(
                    map((url) => [document.id, url] as const),
                    catchError(() => of([document.id, ''] as const))
                )
            )
        ).subscribe((entries) => this.urls.set(Object.fromEntries(entries)));
    }

    /** L'URL courante si elle est encore valable, sinon une URL renouvelée (vide en cas d'échec). */
    fresh(document: CandidateDocument): Observable<string> {
        const current = this.url(document);
        return current && !isSignedUrlExpiredOrExpiring(current) ? of(current) : this.refresh(document);
    }

    refresh(document: CandidateDocument): Observable<string> {
        const attempts = this.attempts.get(document.id) ?? 0;
        if (attempts >= DossierDocumentUrls.MAX_REFRESHES) {
            return of(this.url(document));
        }
        this.attempts.set(document.id, attempts + 1);
        return this.resolve(document).pipe(
            tap((url) => this.urls.update((current) => ({ ...current, [document.id]: url }))),
            catchError(() => of(''))
        );
    }

    clear(): void {
        this.loading?.unsubscribe();
        this.attempts.clear();
        this.urls.set({});
    }
}
