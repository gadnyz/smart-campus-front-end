# Créer un module

Ce tutoriel vous apprend à écrire un module de gestion complet : types, service API, page avec liste et formulaire, routes et tests. Il s'appuie sur un module réel du projet, la gestion des salles du module Planification. Chaque étape cite le code existant, puis indique ce que vous changez pour votre propre ressource.

À la fin, votre page sera prête à être branchée dans l'application, ce que décrit le guide [Brancher un module](brancher-un-module.md).

## Ce que vous allez construire

La gestion des salles est une page unique, accessible dans Paramètres › Planification. Elle affiche la liste des salles, permet de les filtrer et de les rechercher, et ouvre une fenêtre pour créer ou modifier une salle. La suppression passe par une confirmation. Les boutons n'apparaissent que si l'utilisateur a les droits correspondants.

Ce modèle convient aux données de référence, c'est-à-dire des listes courtes gérées par un administrateur. Pour une ressource qui nécessite une page de détail, consultez en plus `features/academic/pages/course-detail/`.

## Avant de commencer

Vous avez besoin des informations suivantes, fournies par l'équipe backend :

- l'URL de la ressource, par exemple `/api/v1/rooms` pour les salles ;
- la forme des réponses et des requêtes. Le backend publie un schéma OpenAPI, que cite le commentaire de `features/scheduling/models/room.model.ts` ;
- le comportement de la liste : tableau simple ou réponse paginée ;
- les autorités qui protègent chaque action.

!!! warning
    N'écrivez pas de service pour un endpoint qui n'existe pas encore. Si l'endpoint manque, adressez la demande à l'équipe backend.

## Arborescence

Les fichiers de la gestion des salles sont les suivants :

```text
features/scheduling/
├── permissions/
│   └── permission.model.ts           Étape 1
├── models/
│   ├── room.model.ts                  Étape 2
│   └── room.model.spec.ts
├── services/
│   ├── room.service.ts                Étape 3
│   └── room.service.spec.ts           Étape 7
├── settings/
│   ├── routes.ts                      Étape 6
│   └── pages/rooms/
│       ├── rooms.ts                   Étapes 4 et 5
│       ├── rooms.html
│       ├── rooms.scss
│       └── rooms.spec.ts              Étape 7
├── scheduling.public-api.ts           Étape 3
└── scheduling.feature.ts              Voir « Brancher un module »
```

Pour un nouveau module, créez `features/<module>/` avec la même organisation.

## Étape 1 : déclarer les autorités

Les autorités sont les droits que l'API transmet à la connexion. Le module les déclare dans un objet constant, pour les référencer sans faute de frappe.

```ts
// src/app/features/scheduling/permissions/permission.model.ts (lignes 8 à 12 et 35)
export const SchedulingPermission = {
    RoomReadAll: 'scheduling:room:read:all',
    RoomCreateAll: 'scheduling:room:create:all',
    RoomUpdateAll: 'scheduling:room:update:all',
    RoomDeleteAll: 'scheduling:room:delete:all',
    // …
} as const;

export type SchedulingPermission = (typeof SchedulingPermission)[keyof typeof SchedulingPermission];
```

Chaque valeur suit le format `module:ressource:action:portée`. Les portées possibles sont décrites dans `core/permissions/permission-scope.ts`.

**À adapter.** Créez `features/<module>/permissions/permission.model.ts` avec les autorités réellement déclarées par le backend pour votre ressource. N'ajoutez aucune autorité qui n'existe pas côté serveur.

## Étape 2 : écrire les types

Les types reprennent exactement le schéma de l'API, champs en snake_case compris. Le même fichier porte les libellés français des valeurs.

```ts
// src/app/features/scheduling/models/room.model.ts (lignes 9 à 44)
export type RoomType = 'ONLINE' | 'OFFICE' | 'LABORATORY' | 'NORMAL';

export interface Room {
    id: string;
    name: string;
    location: string;
    /** Repère libre (bâtiment, étage…) ; optionnel côté backend. */
    coordinates: string | null;
    capacity: number;
    type: RoomType;
    /** Lien de visioconférence — pertinent uniquement pour les salles ONLINE. */
    link: string | null;
    created_at: string;
    updated_at: string;
}

export interface RoomRequest {
    name: string;
    location: string;
    coordinates?: string | null;
    capacity: number;
    type: RoomType;
    link?: string | null;
}

export const ROOM_TYPE_OPTIONS: { label: string; value: RoomType }[] = [
    { label: 'Standard', value: 'NORMAL' },
    { label: 'En ligne', value: 'ONLINE' },
    { label: 'Bureau', value: 'OFFICE' },
    { label: 'Laboratoire', value: 'LABORATORY' }
];

export function roomTypeLabel(type: RoomType | string | null | undefined): string {
    // `||` et non `??` pour le repli : une chaîne vide doit afficher le tiret, pas une cellule vide.
    return ROOM_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? (type || '—');
}
```

Deux interfaces séparent ce que l'API renvoie (`Room`) de ce qu'elle reçoit (`RoomRequest`). La fonction `roomTypeLabel` garantit qu'aucun code technique comme `LABORATORY` ne s'affiche à l'écran.

**À adapter.** Créez `features/<module>/models/<ressource>.model.ts`. Si l'API renvoie une liste paginée, utilisez `PagedResponse<T>` de `shared/models/paged-response.model.ts` plutôt qu'une nouvelle interface.

## Étape 3 : écrire le service API

Le service est la seule classe qui connaît les URL de la ressource. Il renvoie des `Observable` typés et ne s'abonne jamais lui-même.

```ts
// src/app/features/scheduling/services/room.service.ts (lignes 12 à 36)
@Injectable({ providedIn: 'root' })
export class RoomService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/rooms`;

    getAll(): Observable<Room[]> {
        return this.http.get<Room[]>(this.baseUrl);
    }

    getById(id: string): Observable<Room> {
        return this.http.get<Room>(`${this.baseUrl}/${id}`);
    }

    create(payload: RoomRequest): Observable<Room> {
        return this.http.post<Room>(this.baseUrl, payload);
    }

    update(id: string, payload: RoomRequest): Observable<Room> {
        return this.http.put<Room>(`${this.baseUrl}/${id}`, payload);
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }
}
```

L'URL commence par `environment.apiBaseUrl`. En développement, ce préfixe est vide et la requête passe par le proxy. Le jeton d'authentification est ajouté par l'intercepteur : le service n'a pas à s'en occuper.

Si d'autres modules ont besoin de ces types ou de ce service, exposez-les dans le fichier d'API publique du module :

```ts
// src/app/features/scheduling/scheduling.public-api.ts (lignes 7 et 8)
export * from './models/room.model';
export * from './services/room.service';
```

**À adapter.** Créez `features/<module>/services/<ressource>.service.ts` avec l'URL fournie par le backend et seulement les méthodes qu'il expose. Pour une liste paginée ou filtrée, construisez les paramètres avec `toApiParams` (voir [Communication avec le backend](communication-backend.md#pagination-filtres-et-recherche)).

## Étape 4 : écrire l'état de la page

La page garde son état dans des signals. Les valeurs dérivées, comme la liste filtrée ou les droits, sont des `computed`.

```ts
// src/app/features/scheduling/settings/pages/rooms/rooms.ts (lignes 60 à 85)
readonly rooms = signal<Room[]>([]);
readonly loading = signal(false);
readonly saving = signal(false);
readonly dialogVisible = signal(false);
readonly editingId = signal<string | null>(null);
readonly typeFilter = signal<RoomType | null>(null);

readonly typeOptions = ROOM_TYPE_OPTIONS;
readonly roomTypeLabel = roomTypeLabel;

readonly dialogTitle = computed(() => (this.editingId() ? 'Modifier la salle' : 'Nouvelle salle'));

/** Filtrage client-side : `GET /api/v1/rooms` n'expose aucun paramètre de requête. */
readonly filteredRooms = computed(() => {
    const type = this.typeFilter();
    const rooms = this.rooms();
    return type ? rooms.filter((room) => room.type === type) : rooms;
});

readonly canUpdate = computed(() =>
    this.permissionService.hasAnyPermission([SchedulingPermission.RoomUpdateAll])
);

readonly canDelete = computed(() =>
    this.permissionService.hasAnyPermission([SchedulingPermission.RoomDeleteAll])
);
```

Cet état reste local à la page. Si plusieurs écrans doivent partager un même état, suivez le modèle de `core/settings/services/core-settings.store.ts` : un signal privé, une vue publique en lecture seule obtenue avec `asReadonly()`, et des méthodes qui modifient l'état.

**À adapter.** Remplacez les signals par ceux de votre ressource. Gardez `loading` et `saving` : la vue les utilise pour l'indicateur de chargement et pour désactiver le bouton d'enregistrement.

## Étape 5 : écrire la page

### Déclarer le composant

Le composant est standalone et importe explicitement les composants PrimeNG qu'il utilise. Il fournit ses propres `ConfirmationService` et `MessageService`, pour les confirmations et les toasts.

```ts
// src/app/features/scheduling/settings/pages/rooms/rooms.ts (lignes 29 à 58)
@Component({
    selector: 'app-scheduling-rooms',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        TableModule,
        ButtonModule,
        ToastModule,
        ConfirmDialogModule,
        DialogModule,
        InputTextModule,
        InputNumber,
        SelectModule,
        IconFieldModule,
        InputIconModule,
        ContentSubtopbar
    ],
    templateUrl: './rooms.html',
    styleUrl: './rooms.scss',
    providers: [ConfirmationService, MessageService]
})
export class RoomsPage implements OnInit {
    private readonly roomService = inject(RoomService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly messageService = inject(MessageService);
    private readonly permissionService = inject(PermissionService);
    private readonly fb = inject(FormBuilder);
```

### Charger la liste

Les données sont chargées dans `ngOnInit`. En cas d'échec, la page vide la liste et affiche un toast avec un message lisible.

```ts
// src/app/features/scheduling/settings/pages/rooms/rooms.ts (lignes 229 à 243)
private load(): void {
    this.loading.set(true);

    this.roomService.getAll().subscribe({
        next: (rooms) => {
            this.rooms.set([...rooms].sort((a, b) => a.name.localeCompare(b.name)));
            this.loading.set(false);
        },
        error: (error: HttpErrorResponse) => {
            this.rooms.set([]);
            this.loading.set(false);
            this.showError(apiErrorMessage(error, 'Impossible de charger les salles.'));
        }
    });
}
```

### Déclarer le formulaire

Le formulaire est réactif et non nullable. Les validations reprennent les contraintes connues de l'API.

```ts
// src/app/features/scheduling/settings/pages/rooms/rooms.ts (lignes 87 à 94)
readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    location: ['', Validators.required],
    coordinates: [''],
    capacity: [1, [Validators.required, Validators.min(1)]],
    type: ['NORMAL' as RoomType, Validators.required],
    link: ['']
});
```

### Enregistrer

La même méthode crée ou modifie la ressource, selon `editingId`. Les champs facultatifs vides sont envoyés à `null`. Un conflit (409) reçoit un message propre à l'écran.

```ts
// src/app/features/scheduling/settings/pages/rooms/rooms.ts (lignes 157 à 197)
submit(): void {
    if (this.form.invalid) {
        this.form.markAllAsTouched();
        return;
    }

    const raw = this.form.getRawValue();
    const payload = {
        name: raw.name.trim(),
        location: raw.location.trim(),
        coordinates: raw.coordinates.trim() || null,
        capacity: raw.capacity,
        type: raw.type,
        link: raw.link.trim() || null
    };
    const editingId = this.editingId();
    this.saving.set(true);

    const request$ = editingId
        ? this.roomService.update(editingId, payload)
        : this.roomService.create(payload);

    request$.subscribe({
        next: (room) => {
            this.saving.set(false);
            this.dialogVisible.set(false);
            this.editingId.set(null);
            this.load();
            this.showSuccess(editingId ? `Salle ${room.name} modifiée.` : `Salle ${room.name} créée.`);
        },
        error: (error: HttpErrorResponse) => {
            this.saving.set(false);
            this.showError(
                (readableApiText(error.error?.detail ?? '') || null) ??
                    (error.status === 409
                        ? 'Une salle porte déjà ce nom.'
                        : 'Impossible d’enregistrer la salle.')
            );
        }
    });
}
```

### Écrire le template

L'en-tête de page utilise `ContentSubtopbar`. L'action « Nouvelle salle » déclare son autorité : le composant la masque si l'utilisateur ne l'a pas.

```ts
// src/app/features/scheduling/settings/pages/rooms/rooms.ts (lignes 96 à 106)
readonly actions = computed<SubtopbarAction[]>(() => [
    {
        label: 'Nouvelle salle',
        icon: 'pi pi-plus',
        severity: 'info',
        outlined: false,
        command: () => this.openCreateDialog(),
        permissions: [SchedulingPermission.RoomCreateAll],
        mode: 'any'
    }
]);
```

```html
<!-- src/app/features/scheduling/settings/pages/rooms/rooms.html (lignes 1 à 4) -->
<p-toast />
<p-confirmdialog [style]="{ width: '450px' }" />

<app-content-subtopbar kicker="" title="Salles" [actions]="actions()" />
```

Le tableau lit les signals. Les boutons de ligne dépendent des droits calculés à l'étape 4.

```html
<!-- src/app/features/scheduling/settings/pages/rooms/rooms.html (lignes 70 à 96) -->
<td class="stack-actions">
    <div class="flex gap-2">
        @if (canUpdate()) {
        <button
            pButton
            type="button"
            icon="pi pi-pencil"
            rounded
            outlined
            [attr.aria-label]="'Modifier ' + room.name"
            (click)="openEditDialog(room)"
        ></button>
        }
        @if (canDelete()) {
        <button
            pButton
            type="button"
            icon="pi pi-trash"
            rounded
            outlined
            severity="danger"
            [attr.aria-label]="'Supprimer ' + room.name"
            (click)="confirmDelete(room)"
        ></button>
        }
    </div>
</td>
```

Une erreur de saisie s'affiche sous le champ concerné, dès que le champ a été modifié ou quitté :

```html
<!-- src/app/features/scheduling/settings/pages/rooms/rooms.html (lignes 117 à 123) -->
<div>
    <label for="roomName" class="block text-sm text-color-secondary mb-1">Nom</label>
    <input pInputText id="roomName" formControlName="name" placeholder="A101" class="w-full" />
    @if (isInvalid('name')) {
    <small class="text-red-500 block mt-1">Le nom est obligatoire.</small>
    }
</div>
```

**À adapter.** Créez `features/<module>/settings/pages/<ressource>/` ou `features/<module>/pages/<ressource>/`, selon que la page est une donnée de référence (Paramètres) ou une donnée d'exploitation (menu). Reprenez la structure : chargement, formulaire, enregistrement, suppression confirmée, toasts. Écrivez tous les libellés en français et n'affichez jamais d'identifiant technique.

## Étape 6 : déclarer les routes

Le fichier de routes exporte un tableau par défaut. La page est chargée à la demande avec `loadComponent`, et protégée par `permissionGuard`.

```ts
// src/app/features/scheduling/settings/routes.ts (lignes 11 à 22)
export default [
    {
        path: 'rooms',
        loadComponent: () => import('./pages/rooms/rooms').then((m) => m.RoomsPage),
        canActivate: [permissionGuard],
        data: {
            permissions: [SchedulingPermission.RoomUpdateAll],
            mode: 'any'
        }
    },
    { path: '', redirectTo: 'rooms', pathMatch: 'full' }
] as Routes;
```

**À adapter.** Remplacez le chemin, le composant et les autorités. Le montage de ces routes dans l'application est décrit dans [Brancher un module](brancher-un-module.md#declarer-les-routes).

## Étape 7 : écrire les tests

### Tester le service

Le test du service vérifie la méthode HTTP, l'URL et les paramètres, avec `HttpTestingController`. Aucune requête réelle n'est envoyée.

```ts
// src/app/features/scheduling/services/room.service.spec.ts (lignes 32 à 50)
beforeEach(() => {
    TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(RoomService);
    httpTesting = TestBed.inject(HttpTestingController);
});

afterEach(() => {
    httpTesting.verify();
});

it('should list all rooms from a plain array payload (no pagination on this endpoint)', () => {
    let result: Room[] | undefined;
    service.getAll().subscribe((rooms) => (result = rooms));

    const request = httpTesting.expectOne(baseUrl);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys().length).toBe(0);
```

### Tester la page

Le test de la page remplace le service par un espion et fournit un faux `AuthService` qui porte les autorités voulues. Vous testez ainsi l'affichage selon les droits.

```ts
// src/app/features/scheduling/settings/pages/rooms/rooms.spec.ts (lignes 59 à 92)
async function createComponent(authorities: string[], getAll?: Observable<Room[]>): Promise<void> {
    roomService = jasmine.createSpyObj<RoomService>('RoomService', [
        'getAll',
        'create',
        'update',
        'delete'
    ]);
    roomService.getAll.and.returnValue(getAll ?? of(rooms));

    await TestBed.configureTestingModule({
        imports: [RoomsPage],
        providers: [
            provideRouter([]),
            { provide: RoomService, useValue: roomService },
            {
                provide: AuthService,
                useValue: {
                    getCurrentUser: () => ({ id: 'admin', email: 'admin@unh.edu', authorities })
                }
            }
        ]
    }).compileComponents();

    fixture = TestBed.createComponent(RoomsPage);
    component = fixture.componentInstance;

    // RoomsPage déclare ses propres `providers: [ConfirmationService, MessageService]` : ces
    // jetons se résolvent via l'injecteur du composant, pas via TestBed.inject().
    confirmationService = fixture.debugElement.injector.get(ConfirmationService);
    messageService = fixture.debugElement.injector.get(MessageService);

    fixture.detectChanges();
    await fixture.whenStable();
}
```

Vérifiez au minimum : le chargement de la liste, l'affichage des actions selon les autorités, la création, la modification, la suppression et le message affiché en cas d'erreur.

Lancez les tests d'un seul fichier pendant le développement :

```bash
npx ng test --include=src/app/features/scheduling/services/room.service.spec.ts
```

**À adapter.** Placez chaque fichier `.spec.ts` à côté du fichier testé. Remplacez les données de test par des valeurs représentatives de votre ressource.

## Étape suivante

Votre page existe, mais elle n'est encore accessible depuis aucun menu. Suivez [Brancher un module](brancher-un-module.md) pour déclarer le module, l'ajouter au registre, au menu et aux Paramètres, puis contrôler l'ensemble avec la checklist finale.
