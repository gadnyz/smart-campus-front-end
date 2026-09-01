# Conventions Architecturales — UNH SmartCampus (Angular)

> Référence pour le review de tout nouveau module.

---

## 1. Structure de dossiers

```
src/app/
├── core/          ← Services globaux, guards, auth, permissions, settings
├── features/      ← Modules métier (identity, academic, admission…)
│   └── <feature>/
│       ├── <feature>.feature.ts   ← Déclaration AppFeature (clé, routes, menu, settings)
│       ├── routes.ts              ← Routes opérationnelles (lazy)
│       ├── routes.admin.ts        ← Routes admin (/settings)
│       ├── models/                ← Types/interfaces locaux
│       ├── services/              ← Services HTTP du domaine
│       ├── pages/                 ← Composants de page (1 dossier = 1 route)
│       ├── components/            ← Composants réutilisables du feature
│       ├── permissions/           ← Enum IdentityPermission local
│       └── dashboard/             ← Widgets dashboard du feature
├── shared/        ← UI commune, utils, navigation partagée
└── layout/        ← Shell applicatif (topbar, sidebar…)
```

---

## 2. Système de modules (AppFeature)

Chaque feature exporte un objet `AppFeature` (ex. [`identity.feature.ts`](file:///c:/dev/Angular/unh-smartcampus/src/app/features/identity/identity.feature.ts)) qui déclare :
- `key`, `label`, `order` — identité du module
- `route` / `settingsRoute` — lazy-loading via `loadChildren`
- `menu` / `settingsTab` + `items` — navigation avec permissions déclaratives
- `dashboardWidgets` — widgets injectés dans le dashboard central

---

## 3. Gestion de l'état — Signals (Angular 17+)

- **Pas de NgRx ni BehaviorSubject** pour l'état local ; tout repose sur `signal()` / `computed()` (Angular Signals natifs).
- Les services globaux exposent leur état via `signal` en readonly (ex. `AuthService.currentUser`, `CoreSettingsStore.settings`).
- Les composants de page déclarent leurs états locaux en `readonly signal<T>` + `computed` (voir [`user-detail.ts`](file:///c:/dev/Angular/unh-smartcampus/src/app/features/identity/users/pages/user-detail/user-detail.ts)).
- **RxJS** est réservé aux appels HTTP (`Observable`, `tap`, `throwError`). Les souscriptions se font directement dans les méthodes de classe (`.subscribe({ next, error })`), sans `async pipe` systématique.

---

## 4. Services HTTP

- Services `@Injectable({ providedIn: 'root' })`, injectés via `inject()` (pas de constructeur).
- `HttpClient` injecté directement dans le service.
- Pattern URL : `${environment.apiBaseUrl}/api/v1/<ressource>`.
- Pagination via interface `PageableQuery` / `PagedResponse<T>` partagées dans le service.
- Pas d'intercepteur HTTP visible dans les couches features (couche `core/http` à compléter).

---

## 5. Gestion des formulaires

- Formulaires **réactifs** (`ReactiveFormsModule`, `FormBuilder.nonNullable.group`) pour les forms d'édition.
- Formulaires **template-driven** (`FormsModule`) pour les forms simples (ex. login).
- Validation : `Validators` Angular (required, email, minLength, pattern).
- Erreurs serveur (400 `invalid_fields`) centralisées dans un `signal<Record<string, string>>` et affichées inline.

---

## 6. Composants UI

- Librairie UI : **PrimeNG** (Button, InputText, Select, MultiSelect, Tag, Toast, ConfirmDialog…).
- Tous les composants sont **standalone** (`standalone: true`, imports explicites).
- Composant partagé `ContentSubtopbar` pour l'en-tête de page (kicker, titre, actions).
- Les actions de la subtopbar peuvent embarquer des `permissions` + `mode` pour un masquage déclaratif.

---

## 7. Contrôle d'accès

- **Guard fonctionnel** `permissionGuard: CanActivateFn` lit `route.data.permissions` + `route.data.mode` et délègue au `PermissionService`.
- **`PermissionService`** : synchrone, lit les `authorities` de l'utilisateur courant (sessionStorage via `AuthService`). Expose `hasPermission`, `hasAnyPermission`, `hasAllPermissions`, `canAccess`.
- Les permissions sont déclarées comme **enum string** par feature (ex. `IdentityPermission.UserReadAll = 'identity:user:read:all'`).
- Dans les composants, les droits sont exposés via `computed(() => permissionService.hasAnyPermission([...]))` pour un binding réactif dans le template.

---

## 8. Store manuel (pattern)

Le store `CoreSettingsStore` illustre le pattern de store Signal sans NgRx :
- État privé : `private readonly state = signal<T>(initialValue)`
- Vue publique : `readonly settings = this.state.asReadonly()`
- Projections : `computed<View>(() => { ... })`
- Mutations explicites : méthodes `save()`, `reset()`, `load()` appelant `this.state.set()`

---

## 9. Routing

- Lazy-loading via `loadChildren: () => import('./routes')` déclaré dans `AppFeature`.
- Routes admin montées sous `/settings/<feature>`.
- Chaque route protégée embarque `canActivate: [permissionGuard]` + `data: { permissions, mode }`.
- Pas de resolvers observés — les données sont chargées dans `ngOnInit()` du composant.

---

## 10. Conventions de nommage

| Élément | Convention |
|---|---|
| Composant de page | `UserDetail` (classe), dossier `user-detail/` |
| Service | `UsersService`, `PermissionService` |
| Store | `CoreSettingsStore` |
| Guard | `permissionGuard` (fonctionnel, camelCase) |
| Feature descriptor | `identityFeature` (objet `AppFeature`) |
| Routes | `identityAdminRoutes` (tableau exporté nommé) |
| Permissions | Enum `IdentityPermission` par feature |
| Fichiers | kebab-case, sans suffixe `.component` (standalone convention) |
