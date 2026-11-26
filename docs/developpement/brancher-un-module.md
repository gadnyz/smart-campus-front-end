# Brancher un module

Ce guide explique comment rendre un module accessible dans l'application : routes, registre, menu, Paramètres, tableau de bord et droits. Il sert de référence pour chaque propriété. Pour construire un module de bout en bout, suivez d'abord le [démarrage rapide](creer-un-module.md), qui applique toutes ces étapes à un exemple complet.

## Déclarer le module

Chaque module exporte un objet `AppFeature` dans `features/<module>/<module>.feature.ts`. Cet objet décrit tout ce que le module apporte à l'application. Le reste du code lit cette déclaration : vous n'avez pas à modifier le menu, le shell des Paramètres ni le tableau de bord.

Exemple réel, le module Planification :

```ts
// src/app/features/scheduling/scheduling.feature.ts (lignes 14 à 72, commentaires retirés)
export const schedulingFeature: AppFeature = {
    key: 'scheduling',
    label: 'Planification',
    order: 18,
    route: {
        path: 'scheduling',
        loadChildren: () => import('./timetable/routes')
    },
    menu: [
        {
            label: 'Planification',
            order: 18,
            items: [
                {
                    label: 'Horaires',
                    icon: 'pi pi-fw pi-calendar',
                    routerLink: ['/scheduling/timetable'],
                    permissions: MANAGE_TIMETABLES,
                    mode: 'any',
                    order: 10
                },
                {
                    label: 'Mon horaire',
                    icon: 'pi pi-fw pi-calendar-clock',
                    routerLink: ['/scheduling/my-timetable'],
                    permissions: [SchedulingPermission.TimetableEntryReadOwn],
                    hiddenWhenPermissions: MANAGE_TIMETABLES,
                    hiddenWhenMode: 'any',
                    order: 20
                }
            ]
        }
    ],
    settingsTab: {
        key: 'scheduling',
        label: 'Planification',
        order: 28,
        routerLink: ['/settings/scheduling/rooms'],
        permissions: [SchedulingPermission.RoomUpdateAll],
        mode: 'any',
        items: [
            {
                label: 'Salles',
                icon: 'pi pi-map-marker',
                routerLink: ['/settings/scheduling/rooms'],
                permissions: [SchedulingPermission.RoomUpdateAll],
                order: 10
            }
        ]
    },
    settingsRoute: {
        path: 'scheduling',
        loadChildren: () => import('./settings/routes')
    }
};
```

Toutes les propriétés sont facultatives, sauf `key` et `label`. Un module sans entrée de menu déclare `menu: []`, comme le module Identité, dont l'administration vit uniquement dans les Paramètres.

## Déclarer les routes

Un module peut avoir deux familles de routes.

| Propriété | Montage | Usage |
|---|---|---|
| `route` | À la racine du shell : `/<path>` | Données d'exploitation, accessibles par le menu latéral |
| `settingsRoute` | Sous les Paramètres : `/settings/<path>` | Données de référence et configuration, réservées aux administrateurs |

Pour déclarer les routes d'un module :

1. Créez un fichier de routes qui exporte un tableau par défaut, par exemple `features/<module>/routes.ts`.
2. Chargez chaque page à la demande, avec `loadComponent` ou `loadChildren`.
3. Protégez chaque page avec `permissionGuard` et ses autorités dans `data`.

    ```ts
    // src/app/features/scheduling/settings/routes.ts (lignes 12 à 20)
    {
        path: 'rooms',
        loadComponent: () => import('./pages/rooms/rooms').then((m) => m.RoomsPage),
        canActivate: [permissionGuard],
        data: {
            permissions: [SchedulingPermission.RoomUpdateAll],
            mode: 'any'
        }
    },
    ```

4. Ajoutez une route vide qui redirige vers la page par défaut.

    ```ts
    { path: '', redirectTo: 'rooms', pathMatch: 'full' }
    ```

5. Référencez le fichier dans `route` ou `settingsRoute` de la déclaration du module, avec `loadChildren`.

Toutes les routes des modules sont des enfants du shell applicatif, protégé par `authGuard` (`src/app.routes.ts`). Une page de module exige donc toujours une session ouverte. Une page publique, comme `/apply`, se déclare directement dans `src/app.routes.ts`, en dehors du shell.

## Enregistrer le module

Ajoutez la déclaration au tableau `appFeatures` :

```ts
// src/app/core/modules/app-feature.registry.ts (lignes 11 à 17)
export const appFeatures: AppFeature[] = [
    coreSystemFeature,
    identityFeature,
    academicFeature,
    schedulingFeature,
    admissionFeature
].sort(byOrder);
```

1. Importez l'objet `<module>Feature` en haut du fichier.
2. Ajoutez-le au tableau.

Résultat attendu : les routes, les entrées de menu, l'onglet des Paramètres et les widgets du module apparaissent, selon les droits de l'utilisateur connecté.

Le tableau est trié par `order`. Choisissez une valeur qui place le module au bon endroit parmi les modules existants :

| Module | `order` du module | `order` du groupe de menu | `order` de l'onglet de Paramètres |
|---|---|---|---|
| Système | 5 | — | 10 |
| Identité | 10 | — | 20 |
| Académique | 15 | 15 | 25 |
| Planification | 18 | 18 | 28 |
| Admission | 20 | 20 | 30 |

## Ajouter des entrées au menu

La propriété `menu` contient un ou plusieurs groupes. Chaque groupe porte un `label` et des `items`. Chaque entrée accepte les propriétés suivantes, en plus de celles de `MenuItem` de PrimeNG :

| Propriété | Rôle |
|---|---|
| `permissions` | L'entrée est visible si l'utilisateur détient ces autorités |
| `mode` | `'any'` (au moins une, valeur par défaut) ou `'all'` (toutes) |
| `hiddenWhenPermissions` | L'entrée est masquée si l'utilisateur détient ces autorités |
| `hiddenWhenMode` | Mode de calcul de `hiddenWhenPermissions` |
| `order` | Position dans le groupe |

`hiddenWhenPermissions` sert à masquer une vue personnelle aux gestionnaires. Par exemple, « Mon horaire » est visible pour un étudiant, mais masqué pour qui gère les horaires, qui dispose déjà de la vue complète.

## Ajouter un onglet aux Paramètres

La propriété `settingsTab` crée un onglet dans `/settings`. Ses `items` sont les liens secondaires affichés dans l'onglet. L'onglet et chaque lien sont filtrés par leurs `permissions` (`core/settings/pages/settings-shell/settings-shell.ts`).

L'entrée « Paramètres » du menu latéral n'apparaît que si l'utilisateur peut ouvrir au moins un onglet.

## Ajouter un widget au tableau de bord

La propriété `dashboardWidgets` ajoute des composants au tableau de bord. Le tableau de bord n'affiche que les widgets dont l'utilisateur détient les autorités (`pages/dashboard/dashboard.ts`).

```ts
// src/app/features/admission/dashboard/dashboard.widgets.ts (lignes 5 à 16)
export const admissionDashboardWidgets: DashboardWidget[] = [
    {
        key: 'admission-candidate-stats',
        title: 'Candidatures',
        module: 'admission',
        component: CandidateStatsWidget,
        permissions: AdmissionManage.Candidate,
        mode: 'any',
        size: 'sm',
        order: 16
    }
];
```

`size` accepte `'sm'`, `'md'`, `'lg'`, `'xl'` ou `'full'`. Construisez le widget avec `DashboardCard` ou `DashboardStatCard` de `shared/ui/dashboard/`.

## Gérer les droits

### Autorités et portées

L'utilisateur connecté reçoit ses autorités de l'API, dans `authorities`. Une autorité a la forme `module:ressource:action:portée`. Les portées, de la plus étroite à la plus large, sont `own`, `promotion`, `program`, `faculty` et `all` (`core/permissions/permission-scope.ts`).

!!! note
    Le front-end se sert des autorités uniquement pour afficher ou masquer. C'est l'API qui restreint les données renvoyées à la faculté, au programme ou à la promotion de l'utilisateur.

### Protéger une route

`permissionGuard` (`core/permissions/permission.guard.ts`) lit `permissions`, `mode`, `hiddenWhenPermissions` et `hiddenWhenMode` dans `data`. Si l'accès est refusé, il redirige vers `/access-denied`.

### Adapter l'affichage

Dans un composant, injectez `PermissionService` et exposez les droits par des `computed`, que le template lit :

```ts
// src/app/features/scheduling/settings/pages/rooms/rooms.ts (propriété canUpdate)
readonly canUpdate = computed(() =>
    this.permissionService.hasAnyPermission([SchedulingPermission.RoomUpdateAll])
);
```

`PermissionService` propose les méthodes suivantes :

| Méthode | Retourne vrai si l'utilisateur… |
|---|---|
| `hasPermission(autorité)` | détient cette autorité exacte |
| `hasAnyPermission(liste)` | détient au moins une autorité de la liste, ou si la liste est vide |
| `hasAllPermissions(liste)` | détient toutes les autorités de la liste, ou si la liste est vide |
| `canAccess({ permissions, mode })` | satisfait la vérification, selon le mode |
| `hasScope(autorité, minimum)` | détient l'autorité à une portée au moins égale à `minimum` |
| `canWrite(autorité)` | peut exercer l'autorité au-delà de lui-même |
| `canManage(ressource)` | doit voir l'écran de gestion de la ressource |

`scopeOf(autorité)` renvoie la portée la plus large détenue, ou `null`.

Pour une ressource gérée à plusieurs portées, calculez la liste des autorités de gestion avec `manageAuthorities` plutôt que de l'écrire à la main :

```ts
// src/app/features/scheduling/permissions/permission.model.ts (lignes 36 à 44)
export const SchedulingResource = {
    Timetable: 'scheduling:timetable',
    TimetableEntry: 'scheduling:timetable-entry'
} as const;

/** Gestion des horaires : créer, modifier ou supprimer un horaire (faculté ou tout), ou tout lire. */
export const SchedulingManage = {
    Timetable: manageAuthorities(SchedulingResource.Timetable)
} as const;
```

Les actions de `ContentSubtopbar` acceptent aussi `permissions` et `mode` : une action non autorisée n'est pas affichée.

## Libellés et traductions

Le projet n'utilise aucun système de traduction. L'interface est en français, et les libellés sont écrits directement dans les templates et les déclarations de modules.

Pour les dates :

- Formatez-les avec `Intl.DateTimeFormat('fr-FR', …)`, comme dans `features/admission/utils/candidate-format.ts`.
- Le pipe `date` d'Angular n'est utilisé qu'avec des formats numériques, comme `'dd/MM/yyyy'`. Aucune locale française n'est enregistrée dans l'application : un format avec des noms de mois les afficherait en anglais.
- Pour un texte reçu de l'API, `readableApiText` convertit les dates ISO en dates françaises (`shared/http/readable-api-text.ts`).

N'affichez jamais un code technique, comme une valeur d'énumération ou un identifiant : passez par une fonction de libellé, comme `roomTypeLabel` dans `features/scheduling/models/room.model.ts`.

## Checklist finale

Avant d'ouvrir une demande de fusion, vérifiez chaque point.

**Routes**

- [ ] Chaque page est chargée à la demande (`loadComponent` ou `loadChildren`).
- [ ] Chaque page porte `canActivate: [permissionGuard]` et ses autorités dans `data`.
- [ ] Le fichier de routes contient une redirection pour le chemin vide.

**Registre et navigation**

- [ ] La déclaration `<module>Feature` est ajoutée au tableau `appFeatures`.
- [ ] Les valeurs `order` placent le module au bon endroit.
- [ ] Les entrées de menu, l'onglet de Paramètres et les widgets portent leurs autorités.

**Droits**

- [ ] Les autorités utilisées existent côté backend.
- [ ] Les boutons d'action sont masqués sans l'autorité correspondante.
- [ ] Un utilisateur sans droit est redirigé vers `/access-denied`.

**Affichage**

- [ ] Les erreurs de saisie s'affichent sous le champ concerné.
- [ ] Les erreurs de l'API s'affichent dans un toast, avec `apiErrorMessage` ou `readableApiText`.
- [ ] Aucun identifiant technique ni code d'énumération n'est affiché.
- [ ] Les dates sont en français.

**Contrôles**

- [ ] Les tests du module passent : `npm test` ou `npm run test:ci`.
- [ ] `npm run lint` ne signale aucune erreur.
- [ ] `npm run build:prod` réussit, sans dépasser les budgets de `angular.json`.
