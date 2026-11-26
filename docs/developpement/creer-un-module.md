# Démarrage rapide : créer un module

Ce démarrage rapide vous apprend à construire un module complet, de sa déclaration à ses tests, en suivant exactement la structure des modules existants. Il s'adresse aux développeurs qui vont ajouter un module à l'application.

Le module construit ici, « Clubs étudiants », est un **exemple fictif** : il ne fait pas partie de l'application et n'a pas d'API. Son code a été écrit pour cette page, puis vérifié dans le projet : il compile avec `ng build`, ses 10 tests passent et ESLint ne signale rien. Vous pouvez le recopier tel quel pour vous exercer.

À la fin, vous saurez écrire un service de données avant que l'API existe, déclarer des autorités, ajouter des pages, un onglet de Paramètres et un widget de tableau de bord, puis tester le tout.

## Ce que fait le module

Un club est rattaché à une faculté, appartient à une catégorie et a un responsable et des membres. Le module propose :

- une liste des clubs, avec recherche, filtres, impression et export Excel ;
- une fiche par club ;
- un formulaire de création et de modification ;
- un onglet Paramètres › Clubs pour gérer les catégories ;
- un widget « Clubs actifs » sur le tableau de bord.

## Étape 1 : créer l'arborescence

Créez le dossier `src/app/features/clubs/` avec la même organisation que les modules existants :

```text
features/clubs/
├── clubs.feature.ts                 Déclaration du module (étape 8)
├── clubs.public-api.ts              Éléments exposés aux autres modules (étape 8)
├── routes.ts                        Routes opérationnelles (étape 8)
├── models/
│   └── club.model.ts                Types (étape 2)
├── utils/
│   └── club-format.ts               Libellés et couleurs (étape 2)
├── permissions/
│   └── permission.model.ts          Autorités (étape 4)
├── services/
│   ├── club.service.ts              Contrat des données (étape 3)
│   ├── club-memory.service.ts       Implémentation sans backend (étape 3)
│   ├── club-memory.data.ts          Données fictives (étape 3)
│   └── club-memory.service.spec.ts  Tests (étape 9)
├── components/
│   └── club-status-tag/             Composant réutilisé par plusieurs pages (étape 7)
├── pages/
│   ├── club-list/                   Liste (étape 7)
│   ├── club-detail/                 Fiche (étape 7)
│   └── club-form/                   Création et modification (étape 7)
├── settings/
│   ├── routes.ts                    Routes sous /settings/clubs (étape 6)
│   └── pages/club-categories/       Catégories de clubs (étape 6)
└── dashboard/
    ├── dashboard.widgets.ts         Déclaration des widgets (étape 5)
    └── components/club-stats-widget.ts
```

## Étape 2 : écrire les types

Les types reprennent la forme d'une réponse d'API, avec des champs en snake_case. Un membre reprend les champs de la réponse `User` du module Identité.

```ts
// features/clubs/models/club.model.ts
export type ClubStatus = 'ACTIVE' | 'SUSPENDED';

export interface ClubCategory {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
}

/** Membre d'un club : reprend les champs de la réponse `User` du module Identité. */
export interface ClubMember {
    id: string;
    username: string;
    email: string;
    profiles: string[];
}

export interface Club {
    id: string;
    name: string;
    description: string;
    faculty_id: string;
    faculty_name: string;
    category_id: string;
    category_name: string;
    status: ClubStatus;
    manager: ClubMember;
    members: ClubMember[];
    created_at: string;
    updated_at: string;
}

export interface ClubRequest {
    name: string;
    description: string;
    faculty_id: string;
    category_id: string;
    status: ClubStatus;
    manager_id: string;
}

export interface ClubCategoryRequest {
    name: string;
}

export const CLUB_STATUS_OPTIONS: { label: string; value: ClubStatus }[] = [
    { label: 'Actif', value: 'ACTIVE' },
    { label: 'Suspendu', value: 'SUSPENDED' }
];
```

Un code technique comme `ACTIVE` ne s'affiche jamais à l'écran. Les fonctions d'affichage vivent dans `utils/` :

```ts
// features/clubs/utils/club-format.ts
import { CLUB_STATUS_OPTIONS, ClubStatus } from '../models/club.model';

/** Libellé d'un statut : aucun code technique (`ACTIVE`) n'est affiché à l'écran. */
export function clubStatusLabel(status: ClubStatus | string | null | undefined): string {
    return CLUB_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? (status || '—');
}

/** Couleur PrimeNG du statut, pour `p-tag`. */
export function clubStatusSeverity(status: ClubStatus): 'success' | 'warn' {
    return status === 'ACTIVE' ? 'success' : 'warn';
}
```

## Étape 3 : écrire un service de données sans backend

Le module n'a pas encore d'API. Pour avancer quand même, séparez **le contrat** des données de **leur source** :

| Fichier | Rôle |
|---|---|
| `club.service.ts` | Classe abstraite `ClubService` : la liste des méthodes, avec la même interface qu'un service API. Les écrans n'injectent qu'elle. |
| `club-memory.service.ts` | `ClubMemoryService` : implémentation en mémoire, avec des données fictives. |
| `club-api.service.ts` | `ClubApiService` : implémentation HTTP, à écrire quand l'API existera. |

Le projet utilise déjà ce principe pour les exports : `shared/export/provide-export.ts` choisit l'implémentation de `EXPORT_SERVICE`.

### Le contrat

`@Injectable({ providedIn: 'root', useExisting: … })` indique à Angular quelle implémentation fournir quand un écran demande `ClubService`.

```ts
// features/clubs/services/club.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { FacultyReference } from '@/app/features/academic/academic.public-api';
import { Club, ClubCategory, ClubCategoryRequest, ClubMember, ClubRequest } from '../models/club.model';
import { ClubMemoryService } from './club-memory.service';

/**
 * Contrat des données du module Clubs. Les écrans injectent `ClubService` et ne connaissent
 * pas l'implémentation. Aujourd'hui : données en mémoire. Avec un backend : remplacer
 * `useExisting` par une implémentation HTTP, sans toucher aux écrans.
 */
@Injectable({ providedIn: 'root', useExisting: ClubMemoryService })
export abstract class ClubService {
    abstract getAll(): Observable<Club[]>;
    abstract getById(id: string): Observable<Club>;
    abstract create(payload: ClubRequest): Observable<Club>;
    abstract update(id: string, payload: ClubRequest): Observable<Club>;
    abstract delete(id: string): Observable<void>;

    abstract getCategories(): Observable<ClubCategory[]>;
    abstract createCategory(payload: ClubCategoryRequest): Observable<ClubCategory>;
    abstract deleteCategory(id: string): Observable<void>;

    /** Listes de choix du formulaire. */
    abstract getFaculties(): Observable<FacultyReference[]>;
    abstract getMembers(): Observable<ClubMember[]>;
}
```

### Les données fictives

Les données reprennent la forme des réponses réelles : `FacultyReference`, exporté par `academic.public-api.ts`, et les champs de `User` du module Identité. Les adresses utilisent le domaine réservé `example.org`.

```ts
// features/clubs/services/club-memory.data.ts (extrait)
export const DEMO_FACULTIES: FacultyReference[] = [
    { id: 'fac-sciences', code: 'SCI', name: 'Faculté des Sciences', created_at: '2026-09-01T08:00:00Z', updated_at: '2026-09-01T08:00:00Z' },
    { id: 'fac-lettres', code: 'LET', name: 'Faculté des Lettres', created_at: '2026-09-01T08:00:00Z', updated_at: '2026-09-01T08:00:00Z' }
];

export const DEMO_MEMBERS: ClubMember[] = [
    { id: 'user-1', username: 'responsable.echecs', email: 'responsable.echecs@example.org', profiles: ['STUDENT'] },
    { id: 'user-2', username: 'responsable.theatre', email: 'responsable.theatre@example.org', profiles: ['STUDENT'] },
    { id: 'user-3', username: 'membre.un', email: 'membre.un@example.org', profiles: ['STUDENT'] },
    { id: 'user-4', username: 'membre.deux', email: 'membre.deux@example.org', profiles: ['STUDENT'] }
];
```

Le fichier déclare aussi `DEMO_CATEGORIES` (deux catégories) et `DEMO_CLUBS` (deux clubs, dont un suspendu).

### L'implémentation en mémoire

Trois règles rendent cette implémentation fidèle à une vraie API :

1. Chaque méthode renvoie un `Observable`, comme `HttpClient`.
2. Chaque méthode renvoie une **copie** des données : un écran ne peut pas modifier les données stockées par erreur.
3. Les erreurs ont la forme d'une réponse d'erreur de l'API : un `HttpErrorResponse` avec un `detail` au format ProblemDetail. Les écrans les traitent donc avec `apiErrorMessage`, sans code particulier.

??? example "Fichier complet : `features/clubs/services/club-memory.service.ts`"

    ```ts
    import { HttpErrorResponse } from '@angular/common/http';
    import { Injectable } from '@angular/core';
    import { Observable, of, throwError } from 'rxjs';
    import type { FacultyReference } from '@/app/features/academic/academic.public-api';
    import { Club, ClubCategory, ClubCategoryRequest, ClubMember, ClubRequest } from '../models/club.model';
    import { DEMO_CATEGORIES, DEMO_CLUBS, DEMO_FACULTIES, DEMO_MEMBERS } from './club-memory.data';
    import type { ClubService } from './club.service';

    /** Erreur au format ProblemDetail de l'API : les écrans la traitent comme une vraie réponse. */
    function apiError(status: number, detail: string): Observable<never> {
        return throwError(() => new HttpErrorResponse({ status, error: { detail } }));
    }

    /**
     * Implémentation en mémoire de `ClubService`. Les données sont perdues au rechargement de la
     * page. Chaque méthode renvoie une copie, comme une réponse HTTP.
     */
    @Injectable({ providedIn: 'root' })
    export class ClubMemoryService implements ClubService {
        private clubs: Club[] = structuredClone(DEMO_CLUBS);
        private categories: ClubCategory[] = structuredClone(DEMO_CATEGORIES);
        private sequence = 0;

        getAll(): Observable<Club[]> {
            return of(structuredClone(this.clubs));
        }

        getById(id: string): Observable<Club> {
            const club = this.clubs.find((item) => item.id === id);
            return club ? of(structuredClone(club)) : apiError(404, 'Ce club est introuvable.');
        }

        create(payload: ClubRequest): Observable<Club> {
            if (this.nameTaken(payload.name)) {
                return apiError(409, 'Un club porte déjà ce nom.');
            }
            const now = new Date().toISOString();
            const club = this.toClub(`club-${++this.sequence}`, payload, now, now);
            if (!club) {
                return apiError(400, 'La faculté, la catégorie ou le responsable est inconnu.');
            }
            this.clubs = [...this.clubs, club];
            return of(structuredClone(club));
        }

        update(id: string, payload: ClubRequest): Observable<Club> {
            const current = this.clubs.find((item) => item.id === id);
            if (!current) {
                return apiError(404, 'Ce club est introuvable.');
            }
            if (this.nameTaken(payload.name, id)) {
                return apiError(409, 'Un club porte déjà ce nom.');
            }
            const club = this.toClub(id, payload, current.created_at, new Date().toISOString(), current.members);
            if (!club) {
                return apiError(400, 'La faculté, la catégorie ou le responsable est inconnu.');
            }
            this.clubs = this.clubs.map((item) => (item.id === id ? club : item));
            return of(structuredClone(club));
        }

        delete(id: string): Observable<void> {
            if (!this.clubs.some((item) => item.id === id)) {
                return apiError(404, 'Ce club est introuvable.');
            }
            this.clubs = this.clubs.filter((item) => item.id !== id);
            return of(undefined);
        }

        getCategories(): Observable<ClubCategory[]> {
            return of(structuredClone(this.categories));
        }

        createCategory(payload: ClubCategoryRequest): Observable<ClubCategory> {
            const name = payload.name.trim();
            if (this.categories.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
                return apiError(409, 'Cette catégorie existe déjà.');
            }
            const now = new Date().toISOString();
            const category: ClubCategory = { id: `cat-${++this.sequence}`, name, created_at: now, updated_at: now };
            this.categories = [...this.categories, category];
            return of(structuredClone(category));
        }

        deleteCategory(id: string): Observable<void> {
            if (this.clubs.some((club) => club.category_id === id)) {
                return apiError(409, 'Cette catégorie est utilisée par un club et ne peut pas être supprimée.');
            }
            this.categories = this.categories.filter((item) => item.id !== id);
            return of(undefined);
        }

        getFaculties(): Observable<FacultyReference[]> {
            return of(structuredClone(DEMO_FACULTIES));
        }

        getMembers(): Observable<ClubMember[]> {
            return of(structuredClone(DEMO_MEMBERS));
        }

        private nameTaken(name: string, exceptId?: string): boolean {
            const wanted = name.trim().toLowerCase();
            return this.clubs.some((club) => club.id !== exceptId && club.name.toLowerCase() === wanted);
        }

        /** Construit un club à partir de la requête, comme le ferait l'API ; `null` si une référence est inconnue. */
        private toClub(id: string, payload: ClubRequest, createdAt: string, updatedAt: string, members?: ClubMember[]): Club | null {
            const faculty = DEMO_FACULTIES.find((item) => item.id === payload.faculty_id);
            const category = this.categories.find((item) => item.id === payload.category_id);
            const manager = DEMO_MEMBERS.find((item) => item.id === payload.manager_id);
            if (!faculty || !category || !manager) {
                return null;
            }
            return {
                id,
                name: payload.name.trim(),
                description: payload.description.trim(),
                faculty_id: faculty.id,
                faculty_name: faculty.name,
                category_id: category.id,
                category_name: category.name,
                status: payload.status,
                manager,
                members: members ?? [manager],
                created_at: createdAt,
                updated_at: updatedAt
            };
        }
    }
    ```

`ClubMemoryService` importe `ClubService` avec `import type` : l'import disparaît à la compilation, ce qui évite une dépendance circulaire entre les deux fichiers.

### Passer au vrai backend

Quand l'API existera :

1. Écrivez `ClubApiService`, qui implémente le même contrat avec `HttpClient`.
2. Dans `club.service.ts`, remplacez `useExisting: ClubMemoryService` par `useExisting: ClubApiService`, et l'import correspondant.
3. Ne modifiez aucun écran.

Cette bascule a été vérifiée : le projet compile avec `ClubApiService` branché.

```ts
// features/clubs/services/club-api.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AcademicCatalogService, FacultyReference } from '@/app/features/academic/academic.public-api';
import { environment } from '@/environments/environment';
import { Club, ClubCategory, ClubCategoryRequest, ClubMember, ClubRequest } from '../models/club.model';
import type { ClubService } from './club.service';

/**
 * Implémentation HTTP de `ClubService`, pour le jour où le backend exposera les clubs.
 * Les URL `/api/v1/clubs` sont hypothétiques : le module est un exemple.
 */
@Injectable({ providedIn: 'root' })
export class ClubApiService implements ClubService {
    private readonly http = inject(HttpClient);
    private readonly catalog = inject(AcademicCatalogService);
    private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/clubs`;

    getAll(): Observable<Club[]> {
        return this.http.get<Club[]>(this.baseUrl);
    }

    getById(id: string): Observable<Club> {
        return this.http.get<Club>(`${this.baseUrl}/${id}`);
    }

    create(payload: ClubRequest): Observable<Club> {
        return this.http.post<Club>(this.baseUrl, payload);
    }

    update(id: string, payload: ClubRequest): Observable<Club> {
        return this.http.put<Club>(`${this.baseUrl}/${id}`, payload);
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }

    getCategories(): Observable<ClubCategory[]> {
        return this.http.get<ClubCategory[]>(`${this.baseUrl}/categories`);
    }

    createCategory(payload: ClubCategoryRequest): Observable<ClubCategory> {
        return this.http.post<ClubCategory>(`${this.baseUrl}/categories`, payload);
    }

    deleteCategory(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/categories/${id}`);
    }

    /** Les facultés viennent du module Académique, par son API publique. */
    getFaculties(): Observable<FacultyReference[]> {
        return this.catalog.getFaculties();
    }

    getMembers(): Observable<ClubMember[]> {
        return this.http.get<ClubMember[]>(`${this.baseUrl}/members`);
    }
}
```

La liste des facultés vient du vrai module Académique, par `AcademicCatalogService`, exporté par `academic.public-api.ts`. Un module n'importe jamais un fichier interne d'un autre module.

## Étape 4 : déclarer les autorités

Une autorité est un droit transmis par l'API à la connexion, de la forme `module:ressource:action:portée`. Le module déclare les siennes dans un objet constant.

```ts
// features/clubs/permissions/permission.model.ts
import { manageAuthorities } from '@/app/core/permissions/permission-scope';

/**
 * Autorités du module Clubs. Module d'exemple de la documentation : ces clés
 * n'existent pas côté serveur, elles suivent le format `module:ressource:action:portée`.
 */
export const ClubsPermission = {
    ClubReadAll: 'clubs:club:read:all',
    ClubCreateAll: 'clubs:club:create:all',
    ClubUpdateAll: 'clubs:club:update:all',
    ClubDeleteAll: 'clubs:club:delete:all',
    CategoryUpdateAll: 'clubs:category:update:all'
} as const;

export type ClubsPermission = (typeof ClubsPermission)[keyof typeof ClubsPermission];

export const ClubsResource = {
    Club: 'clubs:club'
} as const;

/** Gestion des clubs : créer, modifier ou supprimer un club, ou tout lire. */
export const ClubsManage = {
    Club: manageAuthorities(ClubsResource.Club)
} as const;
```

`manageAuthorities` calcule la liste des autorités qui ouvrent l'écran de gestion : une écriture à une portée de gestion, ou la lecture de la faculté ou de tout.

Le module utilise ses autorités à trois endroits :

| Endroit | Exemple | Effet |
|---|---|---|
| Route | `data: { permissions: ClubsManage.Club }` (étape 8) | Sans l'autorité, la page redirige vers « Accès refusé ». |
| Menu, onglet, widget | `permissions: ClubsManage.Club` (étapes 5, 6 et 8) | L'entrée est masquée. |
| Bouton | `canDelete = computed(() => permissionService.hasAnyPermission([ClubsPermission.ClubDeleteAll]))` (étape 7) | Le bouton n'est pas affiché. |

!!! warning
    Ces autorités sont fictives : aucun compte réel ne les reçoit de l'API. Si vous branchez ce module dans l'application, il n'apparaît dans aucun menu. Les tests simulent les autorités (étape 9).

## Étape 5 : ajouter un widget au tableau de bord

Le widget est un composant qui affiche une carte de statistique avec `DashboardStatCard`, de `shared/ui/dashboard/`.

```ts
// features/clubs/dashboard/components/club-stats-widget.ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DashboardStat, DashboardStatCard } from '@/app/shared/ui/dashboard/dashboard-stat-card/dashboard-stat-card';
import { ClubService } from '../../services/club.service';

/** Nombre de clubs actifs, sur le tableau de bord. */
@Component({
    selector: 'app-club-stats-widget',
    standalone: true,
    imports: [DashboardStatCard],
    template: `<app-dashboard-stat-card [stat]="stat()" />`
})
export class ClubStatsWidget implements OnInit {
    private readonly clubService = inject(ClubService);

    readonly activeClubs = signal<number | string>(0);
    readonly loading = signal(true);

    readonly stat = computed<DashboardStat>(() => ({
        label: 'Clubs actifs',
        value: this.activeClubs(),
        loading: this.loading(),
        icon: 'pi pi-users',
        iconContainerClass: 'bg-green-100 dark:bg-green-400/10',
        iconClass: 'text-green-500',
        listRoute: '/clubs'
    }));

    ngOnInit(): void {
        this.clubService.getAll().subscribe({
            next: (clubs) => {
                this.activeClubs.set(clubs.filter((club) => club.status === 'ACTIVE').length);
                this.loading.set(false);
            },
            error: () => {
                this.activeClubs.set('-');
                this.loading.set(false);
            }
        });
    }
}
```

Le module déclare ensuite ses widgets, avec les autorités qui les rendent visibles :

```ts
// features/clubs/dashboard/dashboard.widgets.ts
import { DashboardWidget } from '@/app/core/modules/app-feature.model';
import { ClubsManage } from '../permissions/permission.model';
import { ClubStatsWidget } from './components/club-stats-widget';

export const clubsDashboardWidgets: DashboardWidget[] = [
    {
        key: 'clubs-active-stats',
        title: 'Clubs actifs',
        module: 'clubs',
        component: ClubStatsWidget,
        permissions: ClubsManage.Club,
        mode: 'any',
        size: 'sm',
        order: 40
    }
];
```

## Étape 6 : ajouter des Paramètres

Les catégories de clubs sont une donnée de référence : elles vivent dans les Paramètres, pas dans le menu. Leur route est montée sous `/settings/clubs` (étape 8).

```ts
// features/clubs/settings/routes.ts
import { Routes } from '@angular/router';
import { permissionGuard } from '@/app/core/permissions/permission.guard';
import { ClubsPermission } from '../permissions/permission.model';

/** Routes de configuration du module, montées sous /settings/clubs. */
export default [
    {
        path: 'categories',
        loadComponent: () => import('./pages/club-categories/club-categories').then((m) => m.ClubCategoriesPage),
        canActivate: [permissionGuard],
        data: {
            permissions: [ClubsPermission.CategoryUpdateAll],
            mode: 'any'
        }
    },
    { path: '', redirectTo: 'categories', pathMatch: 'full' }
] as Routes;
```

La page `ClubCategoriesPage` tient sur un seul écran : un champ pour ajouter une catégorie, un tableau et une confirmation avant suppression. Dans les Paramètres, le surtitre de l'en-tête est « Paramètres ».

```html
<!-- features/clubs/settings/pages/club-categories/club-categories.html (extrait) -->
<app-content-subtopbar kicker="Paramètres" title="Catégories de clubs" />

<div class="card">
    <form [formGroup]="form" class="flex gap-2 mb-4" (ngSubmit)="add()">
        <input pInputText formControlName="name" placeholder="Nouvelle catégorie" aria-label="Nom de la catégorie" class="flex-1" />
        <button pButton type="submit" label="Ajouter" icon="pi pi-plus"></button>
    </form>
```

??? example "Fichier complet : `features/clubs/settings/pages/club-categories/club-categories.ts`"

    ```ts
    import { HttpErrorResponse } from '@angular/common/http';
    import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
    import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
    import { ConfirmationService, MessageService } from 'primeng/api';
    import { ButtonModule } from 'primeng/button';
    import { ConfirmDialogModule } from 'primeng/confirmdialog';
    import { InputTextModule } from 'primeng/inputtext';
    import { TableModule } from 'primeng/table';
    import { ToastModule } from 'primeng/toast';
    import { apiErrorMessage } from '@/app/shared/http/api-error';
    import { ContentSubtopbar } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
    import { ClubCategory } from '../../../models/club.model';
    import { ClubService } from '../../../services/club.service';

    /** Paramètres › Clubs › Catégories : une donnée de référence, gérée sur une seule page. */
    @Component({
        selector: 'app-club-categories',
        standalone: true,
        changeDetection: ChangeDetectionStrategy.OnPush,
        imports: [ReactiveFormsModule, TableModule, ButtonModule, InputTextModule, ToastModule, ConfirmDialogModule, ContentSubtopbar],
        templateUrl: './club-categories.html',
        providers: [ConfirmationService, MessageService]
    })
    export class ClubCategoriesPage implements OnInit {
        private readonly clubService = inject(ClubService);
        private readonly confirmationService = inject(ConfirmationService);
        private readonly messageService = inject(MessageService);
        private readonly fb = inject(FormBuilder);

        readonly categories = signal<ClubCategory[]>([]);
        readonly form = this.fb.nonNullable.group({ name: ['', Validators.required] });

        ngOnInit(): void {
            this.load();
        }

        add(): void {
            if (this.form.invalid) {
                this.form.markAllAsTouched();
                return;
            }
            this.clubService.createCategory(this.form.getRawValue()).subscribe({
                next: (category) => {
                    this.form.reset({ name: '' });
                    this.load();
                    this.messageService.add({ severity: 'success', summary: 'Succès', detail: `Catégorie ${category.name} créée.`, life: 3000 });
                },
                error: (error: HttpErrorResponse) => this.showError(apiErrorMessage(error, 'Impossible de créer la catégorie.'))
            });
        }

        confirmDelete(category: ClubCategory): void {
            this.confirmationService.confirm({
                header: 'Supprimer la catégorie',
                message: `Supprimer ${category.name} ?`,
                acceptLabel: 'Supprimer',
                rejectLabel: 'Annuler',
                acceptButtonStyleClass: 'p-button-danger',
                rejectButtonStyleClass: 'p-button-text',
                accept: () =>
                    this.clubService.deleteCategory(category.id).subscribe({
                        next: () => this.load(),
                        error: (error: HttpErrorResponse) => this.showError(apiErrorMessage(error, 'Impossible de supprimer la catégorie.'))
                    })
            });
        }

        private load(): void {
            this.clubService.getCategories().subscribe((categories) => this.categories.set([...categories].sort((a, b) => a.name.localeCompare(b.name))));
        }

        private showError(detail: string): void {
            this.messageService.add({ severity: 'error', summary: 'Erreur', detail, life: 5000 });
        }
    }
    ```

## Étape 7 : écrire les pages

### Un composant du module

Un élément réutilisé par plusieurs pages du module va dans `components/`. Ici, l'étiquette de statut :

```ts
// features/clubs/components/club-status-tag/club-status-tag.ts
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TagModule } from 'primeng/tag';
import { ClubStatus } from '../../models/club.model';
import { clubStatusLabel, clubStatusSeverity } from '../../utils/club-format';

/** Statut d'un club, réutilisé par la liste et la fiche. */
@Component({
    selector: 'app-club-status-tag',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TagModule],
    template: `<p-tag [value]="label()" [severity]="severity()" />`
})
export class ClubStatusTag {
    readonly status = input.required<ClubStatus>();

    readonly label = computed(() => clubStatusLabel(this.status()));
    readonly severity = computed(() => clubStatusSeverity(this.status()));
}
```

### La liste

La liste utilise les composants partagés des tableaux :

| Composant partagé | Rôle |
|---|---|
| `ContentSubtopbar` (`shared/ui/content-subtopbar/`) | En-tête de page : surtitre, titre et actions, masquées selon les autorités |
| `DataFilter` (`shared/data-table/data-filter/`) | Recherche, filtres avancés et tri |
| `TableToolbar` (`shared/data-table/table-toolbar/`) | Boutons « Imprimer », « Exporter en Excel », « Actualiser » et, si l'écran le permet, « Importer » |

Ces trois composants lisent la même description des colonnes, un tableau de `ColumnDef<Club>`, déclaré une seule fois. `applyQuery` applique la recherche et les filtres : les lignes obtenues sont à la fois affichées, imprimées et exportées.

??? example "Fichier complet : `features/clubs/pages/club-list/club-list.ts`"

    ```ts
    import { HttpErrorResponse } from '@angular/common/http';
    import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
    import { RouterLink } from '@angular/router';
    import { ConfirmationService, MessageService } from 'primeng/api';
    import { ButtonModule } from 'primeng/button';
    import { ConfirmDialogModule } from 'primeng/confirmdialog';
    import { TableModule } from 'primeng/table';
    import { ToastModule } from 'primeng/toast';
    import { PermissionService } from '@/app/core/permissions/permission.service';
    import { ColumnDef } from '@/app/shared/data-table/column.model';
    import { DataFilter } from '@/app/shared/data-table/data-filter/data-filter';
    import { EMPTY_QUERY, TableQuery, applyQuery } from '@/app/shared/data-table/table-query';
    import { TableToolbar } from '@/app/shared/data-table/table-toolbar/table-toolbar';
    import { apiErrorMessage } from '@/app/shared/http/api-error';
    import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
    import { ClubStatusTag } from '../../components/club-status-tag/club-status-tag';
    import { CLUB_STATUS_OPTIONS, Club } from '../../models/club.model';
    import { ClubsPermission } from '../../permissions/permission.model';
    import { ClubService } from '../../services/club.service';

    /** Les colonnes des clubs, déclarées une fois : affichage, recherche, filtres et export. */
    export const CLUB_COLUMNS: ColumnDef<Club>[] = [
        { key: 'name', label: 'Nom', type: 'text', value: (row) => row.name, searchable: true },
        { key: 'faculty', label: 'Faculté', type: 'text', value: (row) => row.faculty_name, searchable: true },
        { key: 'category', label: 'Catégorie', type: 'text', value: (row) => row.category_name },
        { key: 'status', label: 'Statut', type: 'enum', value: (row) => row.status, options: CLUB_STATUS_OPTIONS },
        { key: 'members', label: 'Membres', type: 'number', value: (row) => row.members.length }
    ];

    @Component({
        selector: 'app-club-list',
        standalone: true,
        changeDetection: ChangeDetectionStrategy.OnPush,
        imports: [RouterLink, TableModule, ButtonModule, ToastModule, ConfirmDialogModule, ContentSubtopbar, DataFilter, TableToolbar, ClubStatusTag],
        templateUrl: './club-list.html',
        providers: [ConfirmationService, MessageService]
    })
    export class ClubListPage implements OnInit {
        private readonly clubService = inject(ClubService);
        private readonly permissionService = inject(PermissionService);
        private readonly confirmationService = inject(ConfirmationService);
        private readonly messageService = inject(MessageService);

        readonly clubs = signal<Club[]>([]);
        readonly loading = signal(false);
        readonly columns = CLUB_COLUMNS;
        readonly query = signal<TableQuery>(EMPTY_QUERY);

        /** Lignes affichées, imprimées et exportées. */
        readonly filteredClubs = computed(() => applyQuery(this.clubs(), this.columns, this.query()));

        readonly canUpdate = computed(() => this.permissionService.hasAnyPermission([ClubsPermission.ClubUpdateAll]));
        readonly canDelete = computed(() => this.permissionService.hasAnyPermission([ClubsPermission.ClubDeleteAll]));

        readonly actions = computed<SubtopbarAction[]>(() => [
            {
                label: 'Nouveau club',
                icon: 'pi pi-plus',
                severity: 'info',
                routerLink: ['/clubs/new'],
                permissions: [ClubsPermission.ClubCreateAll],
                mode: 'any'
            }
        ]);

        ngOnInit(): void {
            this.load();
        }

        load(): void {
            this.loading.set(true);
            this.clubService.getAll().subscribe({
                next: (clubs) => {
                    this.clubs.set([...clubs].sort((a, b) => a.name.localeCompare(b.name)));
                    this.loading.set(false);
                },
                error: (error: HttpErrorResponse) => {
                    this.clubs.set([]);
                    this.loading.set(false);
                    this.showError(apiErrorMessage(error, 'Impossible de charger les clubs.'));
                }
            });
        }

        confirmDelete(club: Club): void {
            this.confirmationService.confirm({
                header: 'Supprimer le club',
                message: `Supprimer ${club.name} ?`,
                icon: 'pi pi-exclamation-triangle',
                acceptLabel: 'Supprimer',
                rejectLabel: 'Annuler',
                acceptButtonStyleClass: 'p-button-danger',
                rejectButtonStyleClass: 'p-button-text',
                accept: () => this.delete(club)
            });
        }

        private delete(club: Club): void {
            this.clubService.delete(club.id).subscribe({
                next: () => {
                    this.load();
                    this.messageService.add({ severity: 'success', summary: 'Succès', detail: `${club.name} supprimé.`, life: 3000 });
                },
                error: (error: HttpErrorResponse) => this.showError(apiErrorMessage(error, 'Impossible de supprimer ce club.'))
            });
        }

        private showError(detail: string): void {
            this.messageService.add({ severity: 'error', summary: 'Erreur', detail, life: 5000 });
        }
    }
    ```

??? example "Fichier complet : `features/clubs/pages/club-list/club-list.html`"

    ```html
    <p-toast />
    <p-confirmdialog [style]="{ width: '450px' }" />

    <app-content-subtopbar kicker="Vie étudiante" title="Clubs" [actions]="actions()" />

    <div class="card">
        <p-table [value]="filteredClubs()" [loading]="loading()" [paginator]="true" [rows]="10" [rowHover]="true" dataKey="id"
            currentPageReportTemplate="Affichage de {first} à {last} sur {totalRecords} clubs" [showCurrentPageReport]="true">
            <ng-template pTemplate="caption">
                <div class="flex flex-col gap-3">
                    <div class="flex items-center justify-between gap-3">
                        <div class="font-semibold text-xl">Liste des clubs</div>
                        <app-table-toolbar title="Liste des clubs" [columns]="columns" [rows]="filteredClubs()" [query]="query()" [refreshing]="loading()" (refresh)="load()" />
                    </div>
                    <app-data-filter [columns]="columns" [rows]="clubs()" [(query)]="query" searchPlaceholder="Nom ou faculté…" />
                </div>
            </ng-template>

            <ng-template pTemplate="header">
                <tr>
                    <th>Nom</th>
                    <th>Faculté</th>
                    <th>Catégorie</th>
                    <th>Statut</th>
                    <th>Membres</th>
                    <th><span class="sr-only">Actions</span></th>
                </tr>
            </ng-template>

            <ng-template pTemplate="body" let-club>
                <tr>
                    <td><a [routerLink]="['/clubs', club.id]">{{ club.name }}</a></td>
                    <td>{{ club.faculty_name }}</td>
                    <td>{{ club.category_name }}</td>
                    <td><app-club-status-tag [status]="club.status" /></td>
                    <td>{{ club.members.length }}</td>
                    <td>
                        <div class="flex gap-1">
                            @if (canUpdate()) {
                            <a pButton icon="pi pi-pencil" [rounded]="true" [text]="true" size="small" [routerLink]="['/clubs', club.id, 'edit']" [attr.aria-label]="'Modifier ' + club.name"></a>
                            }
                            @if (canDelete()) {
                            <button pButton type="button" icon="pi pi-trash" [rounded]="true" [text]="true" size="small" severity="danger"
                                [attr.aria-label]="'Supprimer ' + club.name" (click)="confirmDelete(club)"></button>
                            }
                        </div>
                    </td>
                </tr>
            </ng-template>

            <ng-template pTemplate="emptymessage">
                <tr>
                    <td colspan="6">Aucun club.</td>
                </tr>
            </ng-template>
        </p-table>
    </div>
    ```

### La fiche

La fiche lit l'identifiant dans l'adresse, charge le club et affiche ses informations. Ses actions « Liste » et « Modifier » sont déclarées dans l'en-tête ; « Modifier » exige l'autorité de modification.

```ts
// features/clubs/pages/club-detail/club-detail.ts (extrait)
readonly actions = computed<SubtopbarAction[]>(() => {
    const club = this.club();
    return [
        { label: 'Liste', icon: 'pi pi-list', routerLink: ['/clubs'] },
        ...(club
            ? [{ label: 'Modifier', icon: 'pi pi-pencil', severity: 'info' as const, routerLink: ['/clubs', club.id, 'edit'], permissions: [ClubsPermission.ClubUpdateAll] }]
            : [])
    ];
});

ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.clubService.getById(id).subscribe({
        next: (club) => {
            this.club.set(club);
            this.loading.set(false);
        },
        error: (error: HttpErrorResponse) => {
            this.loading.set(false);
            this.messageService.add({ severity: 'error', summary: 'Erreur', detail: apiErrorMessage(error, 'Impossible de charger ce club.'), life: 5000 });
        }
    });
}
```

Le template gère les trois cas : chargement, club trouvé, club introuvable.

```html
<!-- features/clubs/pages/club-detail/club-detail.html (extrait) -->
@if (loading()) {
<p>Chargement…</p>
} @else if (club(); as club) {
<dl class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
        <dt class="text-sm text-color-secondary">Faculté</dt>
        <dd>{{ club.faculty_name }}</dd>
    </div>
    <div>
        <dt class="text-sm text-color-secondary">Statut</dt>
        <dd><app-club-status-tag [status]="club.status" /></dd>
    </div>
</dl>
} @else {
<p>Ce club est introuvable.</p>
}
```

### Le formulaire

Une seule page sert à la création (`/clubs/new`) et à la modification (`/clubs/:id/edit`) : elle regarde si l'adresse contient un identifiant. Les listes de choix sont chargées ensemble avec `forkJoin`.

??? example "Fichier complet : `features/clubs/pages/club-form/club-form.ts`"

    ```ts
    import { Location } from '@angular/common';
    import { HttpErrorResponse } from '@angular/common/http';
    import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
    import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
    import { ActivatedRoute, Router } from '@angular/router';
    import { MessageService } from 'primeng/api';
    import { ButtonModule } from 'primeng/button';
    import { InputTextModule } from 'primeng/inputtext';
    import { SelectModule } from 'primeng/select';
    import { TextareaModule } from 'primeng/textarea';
    import { ToastModule } from 'primeng/toast';
    import { forkJoin } from 'rxjs';
    import type { FacultyReference } from '@/app/features/academic/academic.public-api';
    import { apiErrorMessage } from '@/app/shared/http/api-error';
    import { goBack } from '@/app/shared/navigation/go-back';
    import { ContentSubtopbar } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
    import { CLUB_STATUS_OPTIONS, ClubCategory, ClubMember, ClubStatus } from '../../models/club.model';
    import { ClubService } from '../../services/club.service';

    /** Création (`/clubs/new`) et modification (`/clubs/:id/edit`) d'un club. */
    @Component({
        selector: 'app-club-form',
        standalone: true,
        changeDetection: ChangeDetectionStrategy.OnPush,
        imports: [ReactiveFormsModule, ButtonModule, InputTextModule, SelectModule, TextareaModule, ToastModule, ContentSubtopbar],
        templateUrl: './club-form.html',
        providers: [MessageService]
    })
    export class ClubFormPage implements OnInit {
        private readonly route = inject(ActivatedRoute);
        private readonly router = inject(Router);
        private readonly location = inject(Location);
        private readonly clubService = inject(ClubService);
        private readonly messageService = inject(MessageService);
        private readonly fb = inject(FormBuilder);

        readonly clubId = this.route.snapshot.paramMap.get('id');
        readonly title = computed(() => (this.clubId ? 'Modifier le club' : 'Nouveau club'));
        readonly saving = signal(false);

        readonly faculties = signal<FacultyReference[]>([]);
        readonly categories = signal<ClubCategory[]>([]);
        readonly members = signal<ClubMember[]>([]);
        readonly statusOptions = CLUB_STATUS_OPTIONS;

        readonly form = this.fb.nonNullable.group({
            name: ['', [Validators.required, Validators.maxLength(80)]],
            description: [''],
            faculty_id: ['', Validators.required],
            category_id: ['', Validators.required],
            status: ['ACTIVE' as ClubStatus, Validators.required],
            manager_id: ['', Validators.required]
        });

        ngOnInit(): void {
            forkJoin({
                faculties: this.clubService.getFaculties(),
                categories: this.clubService.getCategories(),
                members: this.clubService.getMembers()
            }).subscribe(({ faculties, categories, members }) => {
                this.faculties.set(faculties);
                this.categories.set(categories);
                this.members.set(members);
            });

            if (this.clubId) {
                this.clubService.getById(this.clubId).subscribe({
                    next: (club) =>
                        this.form.reset({
                            name: club.name,
                            description: club.description,
                            faculty_id: club.faculty_id,
                            category_id: club.category_id,
                            status: club.status,
                            manager_id: club.manager.id
                        }),
                    error: (error: HttpErrorResponse) => this.showError(apiErrorMessage(error, 'Impossible de charger ce club.'))
                });
            }
        }

        isInvalid(name: 'name' | 'faculty_id' | 'category_id' | 'manager_id'): boolean {
            const control = this.form.controls[name];
            return control.invalid && (control.dirty || control.touched);
        }

        submit(): void {
            if (this.form.invalid) {
                this.form.markAllAsTouched();
                return;
            }

            const payload = this.form.getRawValue();
            this.saving.set(true);
            const request$ = this.clubId ? this.clubService.update(this.clubId, payload) : this.clubService.create(payload);

            request$.subscribe({
                next: (club) => {
                    this.saving.set(false);
                    void this.router.navigate(['/clubs', club.id]);
                },
                error: (error: HttpErrorResponse) => {
                    this.saving.set(false);
                    this.showError(apiErrorMessage(error, 'Impossible d’enregistrer le club.'));
                }
            });
        }

        cancel(): void {
            goBack(this.router, this.location, ['/clubs']);
        }

        private showError(detail: string): void {
            this.messageService.add({ severity: 'error', summary: 'Erreur', detail, life: 5000 });
        }
    }
    ```

Une erreur de saisie s'affiche sous le champ concerné ; une erreur de l'API s'affiche dans un toast.

```html
<!-- features/clubs/pages/club-form/club-form.html (extrait) -->
<div>
    <label for="clubFaculty" class="block text-sm text-color-secondary mb-1">Faculté</label>
    <p-select inputId="clubFaculty" formControlName="faculty_id" [options]="faculties()" optionLabel="name" optionValue="id" placeholder="Choisir une faculté" class="w-full" />
    @if (isInvalid('faculty_id')) {
    <small class="text-red-500 block mt-1">La faculté est obligatoire.</small>
    }
</div>

<div class="flex justify-end gap-2">
    <button pButton type="button" label="Annuler" severity="secondary" [outlined]="true" (click)="cancel()"></button>
    <button pButton type="submit" label="Enregistrer" icon="pi pi-save" [loading]="saving()" [disabled]="saving()"></button>
</div>
```

## Étape 8 : déclarer les routes et le module

### Les routes

Chaque page est chargée à la demande (`loadComponent`) et protégée par `permissionGuard`.

```ts
// features/clubs/routes.ts
import { Routes } from '@angular/router';
import { permissionGuard } from '@/app/core/permissions/permission.guard';
import { ClubsManage, ClubsPermission } from './permissions/permission.model';

/** Routes opérationnelles du module, montées sous /clubs. Chaque page est chargée à la demande. */
export default [
    {
        path: '',
        loadComponent: () => import('./pages/club-list/club-list').then((m) => m.ClubListPage),
        canActivate: [permissionGuard],
        data: { permissions: ClubsManage.Club, mode: 'any' }
    },
    {
        path: 'new',
        loadComponent: () => import('./pages/club-form/club-form').then((m) => m.ClubFormPage),
        canActivate: [permissionGuard],
        data: { permissions: [ClubsPermission.ClubCreateAll], mode: 'any' }
    },
    {
        path: ':id',
        loadComponent: () => import('./pages/club-detail/club-detail').then((m) => m.ClubDetailPage),
        canActivate: [permissionGuard],
        data: { permissions: ClubsManage.Club, mode: 'any' }
    },
    {
        path: ':id/edit',
        loadComponent: () => import('./pages/club-form/club-form').then((m) => m.ClubFormPage),
        canActivate: [permissionGuard],
        data: { permissions: [ClubsPermission.ClubUpdateAll], mode: 'any' }
    }
] as Routes;
```

La route `new` est déclarée avant `:id`, sinon `new` serait lu comme un identifiant.

### La déclaration du module

```ts
// features/clubs/clubs.feature.ts
import { AppFeature } from '@/app/core/modules/app-feature.model';
import { clubsDashboardWidgets } from './dashboard/dashboard.widgets';
import { ClubsManage, ClubsPermission } from './permissions/permission.model';

/** Module d'exemple « Clubs étudiants » : routes, menu, Paramètres et tableau de bord. */
export const clubsFeature: AppFeature = {
    key: 'clubs',
    label: 'Clubs étudiants',
    order: 25,
    route: {
        path: 'clubs',
        loadChildren: () => import('./routes')
    },
    menu: [
        {
            label: 'Vie étudiante',
            order: 25,
            items: [
                {
                    label: 'Clubs',
                    icon: 'pi pi-fw pi-users',
                    routerLink: ['/clubs'],
                    permissions: ClubsManage.Club,
                    mode: 'any',
                    order: 10
                }
            ]
        }
    ],
    settingsTab: {
        key: 'clubs',
        label: 'Clubs',
        order: 35,
        routerLink: ['/settings/clubs/categories'],
        permissions: [ClubsPermission.CategoryUpdateAll],
        mode: 'any',
        items: [
            {
                label: 'Catégories',
                icon: 'pi pi-tags',
                routerLink: ['/settings/clubs/categories'],
                permissions: [ClubsPermission.CategoryUpdateAll],
                order: 10
            }
        ]
    },
    settingsRoute: {
        path: 'clubs',
        loadChildren: () => import('./settings/routes')
    },
    dashboardWidgets: clubsDashboardWidgets
};
```

### L'API publique du module

Les autres modules n'importent que ce fichier.

```ts
// features/clubs/clubs.public-api.ts
/** Éléments du module Clubs que d'autres modules peuvent importer. */
export * from './models/club.model';
export { ClubService } from './services/club.service';
export { clubStatusLabel } from './utils/club-format';
```

### L'enregistrement

Dans `src/app/core/modules/app-feature.registry.ts`, importez la déclaration et ajoutez-la au tableau :

```ts
import { clubsFeature } from '@/app/features/clubs/clubs.feature';

export const appFeatures: AppFeature[] = [
    coreSystemFeature,
    identityFeature,
    academicFeature,
    schedulingFeature,
    admissionFeature,
    clubsFeature
].sort(byOrder);
```

Le menu, les Paramètres et le tableau de bord lisent ce registre : vous n'avez rien d'autre à modifier. Le détail de chaque propriété est dans [Brancher un module](brancher-un-module.md).

## Étape 9 : écrire les tests

### Le service

Le test vérifie le contrat : la bonne implémentation est fournie, les erreurs ont la forme de l'API, et les données sont copiées.

```ts
// features/clubs/services/club-memory.service.spec.ts
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { ClubRequest } from '../models/club.model';
import { ClubMemoryService } from './club-memory.service';
import { ClubService } from './club.service';

describe('ClubMemoryService', () => {
    let service: ClubService;

    const payload: ClubRequest = {
        name: 'Club de lecture',
        description: '',
        faculty_id: 'fac-lettres',
        category_id: 'cat-arts',
        status: 'ACTIVE',
        manager_id: 'user-3'
    };

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(ClubService);
    });

    it('should be the implementation behind ClubService', () => {
        expect(service).toBe(TestBed.inject(ClubMemoryService));
    });

    it('should create a club and resolve its references', async () => {
        const club = await firstValueFrom(service.create(payload));

        expect(club.faculty_name).toBe('Faculté des Lettres');
        expect(club.manager.username).toBe('membre.un');
        expect((await firstValueFrom(service.getAll())).length).toBe(3);
    });

    it('should reject a duplicate name with a 409 ProblemDetail, like the API', async () => {
        const error = await firstValueFrom(service.create({ ...payload, name: 'Club d’échecs' })).catch((e: unknown) => e);

        expect(error instanceof HttpErrorResponse).toBeTrue();
        expect((error as HttpErrorResponse).status).toBe(409);
        expect((error as HttpErrorResponse).error.detail).toBe('Un club porte déjà ce nom.');
    });

    it('should refuse to delete a category used by a club', async () => {
        const error = await firstValueFrom(service.deleteCategory('cat-jeux')).catch((e: unknown) => e);

        expect((error as HttpErrorResponse).status).toBe(409);
    });

    it('should return copies, so a screen cannot change the stored data', async () => {
        const [club] = await firstValueFrom(service.getAll());
        club.name = 'Modifié';

        const [again] = await firstValueFrom(service.getAll());
        expect(again.name).not.toBe('Modifié');
    });
});
```

### La liste et les autorités

Les autorités viennent de l'utilisateur connecté. Le test remplace `AuthService` par un objet qui renvoie les autorités voulues, puis vérifie ce qui est réellement affiché.

```ts
// features/clubs/pages/club-list/club-list.spec.ts
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { AuthService } from '@/app/core/auth/services/auth.service';
import { ClubsPermission } from '../../permissions/permission.model';
import { ClubListPage } from './club-list';

describe('ClubListPage', () => {
    /** Les autorités viennent de l'utilisateur connecté : on simule `AuthService`. */
    async function render(authorities: string[]) {
        await TestBed.configureTestingModule({
            imports: [ClubListPage],
            providers: [provideRouter([]), { provide: AuthService, useValue: { getCurrentUser: () => ({ id: 'u1', authorities }) } }]
        }).compileComponents();

        const fixture = TestBed.createComponent(ClubListPage);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
        return fixture;
    }

    function subtopbarLabels(fixture: Awaited<ReturnType<typeof render>>): string[] {
        return fixture.debugElement.queryAll(By.css('app-content-subtopbar a, app-content-subtopbar button')).map((el) => (el.nativeElement as HTMLElement).textContent?.trim() ?? '');
    }

    it('should list the clubs sorted by name', async () => {
        const fixture = await render([ClubsPermission.ClubReadAll]);

        expect(fixture.componentInstance.clubs().map((club) => club.name)).toEqual(['Atelier théâtre', 'Club d’échecs']);
    });

    it('should show « Nouveau club » only with the create authority', async () => {
        const reader = await render([ClubsPermission.ClubReadAll]);
        expect(subtopbarLabels(reader)).not.toContain('Nouveau club');

        TestBed.resetTestingModule();
        const creator = await render([ClubsPermission.ClubReadAll, ClubsPermission.ClubCreateAll]);
        expect(subtopbarLabels(creator)).toContain('Nouveau club');
    });

    it('should hide the delete buttons without the delete authority', async () => {
        const fixture = await render([ClubsPermission.ClubReadAll]);

        expect(fixture.nativeElement.querySelector('button[aria-label^="Supprimer"]')).toBeNull();
    });
});
```

### Le formulaire

```ts
// features/clubs/pages/club-form/club-form.spec.ts
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ClubFormPage } from './club-form';

describe('ClubFormPage', () => {
    async function render() {
        await TestBed.configureTestingModule({
            imports: [ClubFormPage],
            providers: [provideRouter([])]
        }).compileComponents();

        const fixture = TestBed.createComponent(ClubFormPage);
        fixture.detectChanges();
        await fixture.whenStable();
        return fixture;
    }

    it('should not save an invalid form and show the field errors', async () => {
        const fixture = await render();
        const navigate = spyOn(TestBed.inject(Router), 'navigate');

        fixture.componentInstance.submit();
        fixture.detectChanges();

        expect(navigate).not.toHaveBeenCalled();
        expect(fixture.nativeElement.textContent).toContain('Le nom est obligatoire');
    });

    it('should create the club and open its page', async () => {
        const fixture = await render();
        const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);

        fixture.componentInstance.form.setValue({
            name: 'Club photo',
            description: 'Sorties photo le samedi.',
            faculty_id: 'fac-sciences',
            category_id: 'cat-arts',
            status: 'ACTIVE',
            manager_id: 'user-4'
        });
        fixture.componentInstance.submit();

        expect(navigate).toHaveBeenCalledWith(['/clubs', jasmine.stringMatching(/^club-/)]);
    });
});
```

Comme le service en mémoire est synchrone, ces tests n'ont besoin ni de `HttpTestingController` ni de faux serveur. Quand vous passerez à `ClubApiService`, testez-la avec `HttpTestingController`, comme `features/scheduling/services/room.service.spec.ts`.

Lancez uniquement les tests du module :

```bash
npx ng test --include='src/app/features/clubs/**/*.spec.ts'
```

## Étape 10 : checklist finale

**Structure**

- [ ] Le dossier du module reprend la structure de l'étape 1.
- [ ] Les autres modules n'importent que `clubs.public-api.ts`, et ce module n'importe que les API publiques des autres.

**Données**

- [ ] Les écrans n'injectent que `ClubService`, jamais une implémentation.
- [ ] Les erreurs du service ont la forme d'une réponse d'erreur de l'API.

**Droits**

- [ ] Chaque route, entrée de menu, onglet, widget et bouton d'action porte ses autorités.
- [ ] Les autorités utilisées existent côté serveur, ou sont signalées comme fictives.

**Affichage**

- [ ] Aucun code technique n'est affiché : les statuts passent par `clubStatusLabel`.
- [ ] Les erreurs de saisie s'affichent sous le champ, les erreurs de l'API dans un toast.

**Contrôles**

- [ ] Les tests du module passent.
- [ ] `npm run lint` ne signale aucune erreur.
- [ ] `npm run build:prod` réussit.

La checklist complète de branchement est dans [Brancher un module](brancher-un-module.md#checklist-finale).
