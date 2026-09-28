# Audit technique Angular — UNH SmartCampus

> Audit réalisé le 28/09/2026 sur la branche `feature/admission-faculty-filter` (HEAD `7db320c`).
> **Aucun fichier source n'a été modifié.** Toutes les affirmations ci-dessous ont été vérifiées dans le code ou par exécution de commandes (`ng build`, `ng lint`, `ng test`).

---

## 1. Résumé exécutif

UNH SmartCampus est une application Angular 21 **100 % standalone, zoneless et signal-first**, structurée autour d'un registre de modules maison (`AppFeature`) qui permet à chaque domaine métier de déclarer ses routes, son menu, son onglet de paramètres et ses widgets de tableau de bord. C'est une architecture peu commune et franchement réussie : ajouter un module se fait en un fichier descripteur, sans toucher au cœur. Le projet est également documenté avec sérieux (`conventions_architecturales.md`, `DESIGN.md`, `README.md`), ce qui est rare à ce stade de maturité.

Le socle technique est sain. **Le build de production passe sans aucune erreur ni avertissement** (940 kB brut / 232 kB transféré en initial, sous le budget de 1 Mo). Le mode TypeScript `strict` est activé avec les options avancées (`noPropertyAccessFromIndexSignature`, `noImplicitReturns`, `strictTemplates`), et l'usage de `any` est remarquablement contenu (6 occurrences sur ~27 000 lignes). Les templates utilisent exclusivement la syntaxe de contrôle de flux moderne (`@if`/`@for`), et **toutes les boucles `@for` portent un `track`** — aucun `*ngFor` legacy ne subsiste.

Les faiblesses se concentrent sur trois axes. **Premièrement, la chaîne de livraison** : l'artefact de production est actuellement non fonctionnel (l'API est codée en dur sur `http://localhost:8085` et l'image nginx n'expose aucun proxy `/api`), et le workflow GitHub Actions publie sur Docker Hub **sans exécuter ni lint, ni test, ni vérification de type** — ce qui contredit directement la règle « Block merge if tests fail » de `AGENTS.md`. **Deuxièmement, la réactivité des permissions** : `PermissionService` lit `localStorage` de façon synchrone, si bien que les dizaines de `computed()` construits par-dessus (documentés comme « binding réactif » au §7 des conventions) n'ont en réalité **aucune dépendance réactive** et ne se réévaluent jamais. **Troisièmement, le cycle de vie RxJS** : 9 souscriptions à des observables non complétants (`route.paramMap`, `valueChanges`, `router.events`) ne sont pas libérées, et les caches applicatifs (`CandidateService.detailCache`, `AcademicCatalogService`) survivent à la déconnexion.

À cela s'ajoutent une suite de tests qui **ne peut pas aller au bout** (le navigateur crashe sur `core/auth/error.spec.ts`, laissant 54 specs non exécutées et rendant la couverture non mesurable — `Unknown% (0/0)`), **3 tests en échec**, 6 erreurs de lint, une demi-douzaine de composants morts, et l'absence totale d'internationalisation et de tests e2e. Deux de ces échecs sont particulièrement instructifs : ils démontrent que **les rôles en lecture seule sont exclus du module Académique** — l'accès aux listes Professeurs et Étudiants exige partout un droit d'écriture, alors que les permissions de lecture correspondantes sont déclarées mais jamais exploitées.

### Note globale : **6,5 / 10**

| Axe | Note | Justification |
|---|---|---|
| Architecture & organisation | 8,5/10 | Registre `AppFeature` élégant et extensible ; inversion de dépendance `core → features` à corriger |
| Qualité du code TypeScript | 8/10 | `strict` complet, `any` quasi absent, build propre ; 6 erreurs de lint |
| Routing & contrôle d'accès | 6/10 | Guards fonctionnels et permissions déclaratives cohérentes ; rôles lecture seule exclus du module Académique, pas de `returnUrl`, redirection `/settings` cassée |
| Gestion d'état & signals | 5,5/10 | Bon pattern de store ; mais toute la chaîne de permissions est non réactive |
| RxJS & cycle de vie | 4,5/10 | 9 fuites de souscriptions, `subscribe` imbriqués, `throw` dans un `map` |
| Sécurité | 5/10 | RBAC déclaratif solide côté UI ; tokens en `localStorage`, caches non purgés, aucun en-tête de sécurité |
| Performance | 7/10 | Lazy loading par feature, budgets respectés, `track` partout ; widgets dashboard en bundle initial, pagination plafonnée |
| Tests & CI | 3/10 | 214 specs écrits (effort réel) mais suite qui crashe, couverture non mesurable, CI sans aucun gate |
| UI/UX & accessibilité | 6/10 | Design system cohérent, 20/20 tables responsive ; aucune i18n, a11y partielle |

**Verdict** : un projet avec de très bonnes fondations architecturales, porté par des conventions explicites et respectées. Ce qui manque n'est pas de la refonte mais de la **rigueur d'industrialisation** : rendre le pipeline bloquant, réparer l'artefact de production, et traiter la dette RxJS/réactivité. Aucun de ces chantiers n'est structurel.

---

## 2. Fiche technique

| Élément | Valeur |
|---|---|
| **Version Angular** | 21 (`^21` sur `@angular/*`) |
| **TypeScript** | 5.9.3 |
| **Style d'architecture** | 100 % standalone — aucun `NgModule` dans `src/` |
| **Détection de changement** | `provideZonelessChangeDetection()` ([app.config.ts:57](src/app.config.ts#L57)) |
| **État** | Signals natifs (`signal`/`computed`) — pas de NgRx, pas de `BehaviorSubject` |
| **Librairie UI** | PrimeNG 21.0.2 + `@primeuix/themes` 2 (preset Aura personnalisé `UNHPreset`) |
| **CSS** | Tailwind CSS 4.1.11 + `tailwindcss-primeui` + SCSS |
| **HTTP** | `provideHttpClient(withFetch(), withInterceptors([authInterceptor]))` |
| **Autres dépendances clés** | `rxjs` 7.8, `chart.js` 4.4.2, `libphonenumber-js` 1.13.7, `quill` 2.0.3 |
| **Runner de tests** | Karma 6.4 + Jasmine 5.4 (`karma-coverage`) |
| **Lint** | ESLint 9 (flat config) + `angular-eslint` 21.3.1 + `typescript-eslint` 8.56 |
| **Alias de chemin** | `@/*` → `src/*` ([tsconfig.json:29-33](tsconfig.json#L29-L33)) |
| **Fichiers** | 188 `.ts` (dont 38 `.spec.ts`), 40 `.html`, ~27 400 lignes |
| **Composants** | 64 |

### Options TypeScript / Angular activées

`strict: true`, `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `isolatedModules`, et côté Angular `strictInjectionParameters`, `strictInputAccessModifiers`, `strictTemplates`. **Configuration exemplaire** — rien à redire.

### Résultat du build

```
npm run build:prod  →  exit 0
Application bundle generation complete. [70.7 s]

Initial total : 940,51 kB brut | 231,52 kB transféré
Budget initial : maximumWarning 1 mb / maximumError 5 mb  → respecté (92 % du seuil d'alerte)
Lazy chunks : 38 chunks (le plus gros : candidate-create, 258,91 kB / 56,31 kB)
```

**0 erreur, 0 avertissement.** Aucune erreur de compilation ni de typage de template.

### Résultat du lint

```
npm run lint  →  6 problems (6 errors, 0 warnings)
```

| Fichier:ligne | Règle | Message |
|---|---|---|
| [login.ts:139](src/app/core/auth/login.ts#L139) | `@typescript-eslint/no-unused-vars` | `'user' is assigned a value but never used` |
| [academic-reference.model.ts:19](src/app/features/academic/models/academic-reference.model.ts#L19) | `@typescript-eslint/no-empty-object-type` | `interface FacultyReference extends AcademicReference {}` |
| [student-detail.html:203](src/app/features/academic/pages/student-detail/student-detail.html#L203) | `@angular-eslint/template/eqeqeq` | `Expected !== but received !=` |
| [candidate-status-stats-widget.ts:3](src/app/features/admission/dashboard/components/candidate-status-stats-widget.ts#L3) | `no-unused-vars` | `'forkJoin'` non utilisé |
| [candidate-status-stats-widget.ts:3](src/app/features/admission/dashboard/components/candidate-status-stats-widget.ts#L3) | `no-unused-vars` | `'of'` non utilisé |
| [candidate-status-stats-widget.ts:4](src/app/features/admission/dashboard/components/candidate-status-stats-widget.ts#L4) | `no-unused-vars` | `'catchError'` non utilisé |

⚠️ La configuration ESLint **désactive 13 règles**, dont plusieurs structurantes : `@typescript-eslint/no-explicit-any`, `prefer-const`, `no-var`, `@angular-eslint/use-lifecycle-interface`, et 6 règles d'accessibilité côté template (`click-events-have-key-events`, `interactive-supports-focus`, `alt-text`, `no-autofocus`…). Le lint tel que configuré ne peut donc **pas** détecter les problèmes d'a11y ni les `any`.

### Résultat des tests

```
npx ng test --watch=false --browsers=ChromeHeadless
  →  Executed 160 of 214 (3 FAILED) DISCONNECTED
     ERROR: Disconnected reconnect failed before timeout of 2000ms (transport close)

npm run test:ci
  →  Coverage summary
     Statements : Unknown% ( 0/0 )
     Branches   : Unknown% ( 0/0 )
     Functions  : Unknown% ( 0/0 )
     Lines      : Unknown% ( 0/0 )
```

**La suite n'atteint jamais son terme.** En rejouant les specs par tranches, le crash a été isolé à **un seul fichier** :

| Tranche | Résultat |
|---|---|
| **`src/app/core/auth/error.spec.ts`** | 💥 **ERROR — navigateur déconnecté (fichier fautif isolé)** |
| `src/app/core/auth/login.spec.ts` | ✅ 19 SUCCESS |
| `src/app/core/auth/guards/*.spec.ts` | ✅ 4 SUCCESS |
| `src/app/core/auth/interceptors/*.spec.ts` | ✅ 16 SUCCESS |
| `src/app/core/auth/services/*.spec.ts` | ✅ 17 SUCCESS |
| `src/app/layout/**/*.spec.ts` | ✅ 9 SUCCESS |
| `src/app/shared/**/*.spec.ts` | ✅ 3 SUCCESS |
| `src/environments/**/*.spec.ts` | ✅ 1 SUCCESS |
| `src/app/features/identity/**/*.spec.ts` | ❌ **1 FAILED**, 34 SUCCESS |
| `src/app/features/admission/**/*.spec.ts` | ✅ 16 SUCCESS |
| `src/app/features/academic/**/*.spec.ts` | ❌ **2 FAILED**, 53 SUCCESS |

Conséquences : **54 specs sur 214 ne s'exécutent jamais**, et la couverture est **non mesurable**. La règle « Minimum coverage 90 % » de `AGENTS.md` est donc aujourd'hui inapplicable.

**Cause du crash — confirmée par bissection.** `npx ng test --include='src/app/core/auth/error.spec.ts'` déconnecte le navigateur à lui seul, alors que `login.spec.ts` passe (19 SUCCESS). `error.spec.ts` instancie le composant `Error`, qui importe `AppFloatingConfigurator` → `AppConfigurator` (463 lignes), dont le `ngOnInit` appelle `onPresetChange()` et déclenche une mutation lourde du thème PrimeNG ([app.configurator.ts:117-121](src/app/layout/component/app.configurator.ts#L117-L121)).

#### Les 3 tests en échec

**1.** [user-create.spec.ts:214](src/app/features/identity/users/pages/user-create/user-create.spec.ts#L214) — `should map SQL duplicate email constraint to a friendly message`

```
Expected 'Un utilisateur avec ces informations existe déjà.' to contain 'déjà utilisée'.
Expected $[0].detail = 'Un utilisateur avec ces informations existe déjà.'
  to equal <jasmine.stringMatching(/e-mail est déjà associée/)>.
```

**2. et 3.** [academic-home-redirect.spec.ts:38,46](src/app/features/academic/pages/academic-home-redirect/academic-home-redirect.spec.ts#L38-L52) — `should send an academic admin to the professors list…` / `should send a student manager to the students list…`

```
Expected $[0][0] = '/access-denied' to equal '/academic/professors'.
Expected $[0][0] = '/access-denied' to equal '/academic/students'.
```

Ces deux échecs révèlent un **écart de conception lecture/écriture** dans le contrôle d'accès du module Académique, détaillé en **M15**.

**Tests e2e : aucun.** Pas de Cypress, Playwright ni Protractor dans `package.json`, malgré la mention « Generate e2e tests » dans `AGENTS.md`.

---

## 3. Cartographie des artefacts

### Vue d'ensemble

| Module | Composants | Services | Guards | Interceptors | Modèles | Routes | Specs |
|---|---|---|---|---|---|---|---|
| **core** | 11 | 5 | 3 | 1 | 4 | 5 fichiers | 11 |
| **Identité** | 15 | 2 | — | — | 2 | 2 fichiers | 3 |
| **Admission** | 7 | 3 | — | — | 2 | 2 fichiers | 4 |
| **Académique** | 24 | 13 | — | — | 12 | 2 fichiers | 14 |
| **layout** | 8 | 1 | — | — | — | — | 3 |
| **shared** | 3 | 1 | — | — | — | — | 2 |
| **pages** (dashboard) | 1 | — | — | — | 1 | — | 0 |

### core — `src/app/core/`

| Type | Artefact | Fichier |
|---|---|---|
| Service | `AuthService` | [auth.service.ts](src/app/core/auth/services/auth.service.ts) |
| Service | `FacultyScopeService` | [faculty-scope.service.ts](src/app/core/auth/services/faculty-scope.service.ts) |
| Service | `PermissionService` | [permission.service.ts](src/app/core/permissions/permission.service.ts) |
| Store | `CoreSettingsStore` | [core-settings.store.ts](src/app/core/settings/services/core-settings.store.ts) |
| Registre | `appFeatures`, `appFeatureRoutes`, `appMenuItems`, `appSettingsTabs`, `appDashboardWidgets` | [app-feature.registry.ts](src/app/core/modules/app-feature.registry.ts) |
| Guard | `authGuard` (`CanActivateFn`) | [auth.guard.ts](src/app/core/auth/guards/auth.guard.ts) |
| Guard | `guestGuard` (`CanActivateChildFn`) | [guest.guard.ts](src/app/core/auth/guards/guest.guard.ts) |
| Guard | `permissionGuard` (`CanActivateFn`) | [permission.guard.ts](src/app/core/permissions/permission.guard.ts) |
| Interceptor | `authInterceptor` (Bearer + refresh 401) | [auth.interceptor.ts](src/app/core/auth/interceptors/auth.interceptor.ts) |
| Contexte HTTP | `PUBLIC_API_REQUEST` | [public-api.context.ts](src/app/core/auth/interceptors/public-api.context.ts) |
| Pipe | `FirstCharPipe` ⚠️ **non utilisé** | [Pipes.ts](src/app/core/services/Pipes.ts) |
| Modèles | `AuthenticatedUser`, `AuthResponse`, `LoginRequest`, `LogoutRequest`, `RefreshRequest`, `ForgotPasswordRequest`, `ResetPasswordRequest` | [auth.model.ts](src/app/core/auth/models/auth.model.ts) |
| Modèles | `PermissionCheck`, `PermissionRouteData`, `PermissionAwareItem`, `PermissionMode` | [permission.model.ts](src/app/core/permissions/permission.model.ts) |
| Modèles | `AppFeature`, `DashboardWidget`, `FeatureMenuItem`, `SettingsTab`, `SettingsTabItem` | [app-feature.model.ts](src/app/core/modules/app-feature.model.ts) |
| Composants | `Login`, `Access`, `Error`, `Notfound`, `forgetPassword`, `ResetPassword`, `AuthFooter`, `SettingsShell`, `SystemSettingsPage` | `core/auth/`, `core/settings/`, `core/navigation/` |
| Config | `appBrand` | [app-brand.ts](src/app/core/config/app-brand.ts) |
| Routes | `auth.routes.ts`, `settings/routes.ts`, `settings/system.routes.ts` | |

> **Dossiers vides** (uniquement `.gitkeep`) : `core/http/`, `core/module-registry/`, `core/state/`, `core/navigation/` (partiellement), `shared/forms/`, `shared/models/`, `shared/ui/`. Le §4 des conventions note d'ailleurs « couche `core/http` à compléter ».

### Identité — `src/app/features/identity/`

| Type | Artefact | Fichier |
|---|---|---|
| Descripteur | `identityFeature` | [identity.feature.ts](src/app/features/identity/identity.feature.ts) |
| Service | `UsersService` | [user.service.ts](src/app/features/identity/users/services/user.service.ts) |
| Service | `IdentityManagementService` (rôles, profils, privilèges) | [identity-management.service.ts](src/app/features/identity/services/identity-management.service.ts) |
| Pages | `UserManagement`, `UserCreate`, `UserDetail`, `UserProfile`, `Preferences`, `RoleManagement`, `ProfileManagement` | `users/pages/`, `pages/` |
| Composants | `UserList`, `StatsWidget`, `RepartitionUsers` | `users/components/`, `dashboard/components/` |
| Redirections | `IdentityUserRedirect` | [identity-user-redirect.ts](src/app/features/identity/pages/identity-user-redirect.ts) |
| ⚠️ Morts | `UserPassword`, `IdentityPlaceholder`, `UserForm`, `StatCard` | non référencés |
| Permissions | `IdentityPermission` (16 clés) | [permission.model.ts](src/app/features/identity/permissions/permission.model.ts) |
| Modèles | `User`, `RegisterRequest`, `UpdateUserRequest`, `AvatarUploadUrlResponse`, `RoleResponse`, `PrivilegeResponse`, `UserProfileResponse`… | `users/models/`, `models/` |
| Routes | `routes.ts` (compte personnel, `/identity`) + `routes.admin.ts` (`/settings/identity`) | |
| Widgets | `identity-users-stats`, `identity-users-repartition` | [dashboard.widgets.ts](src/app/features/identity/dashboard/dashboard.widgets.ts) |

### Admission — `src/app/features/admission/`

| Type | Artefact | Fichier |
|---|---|---|
| Descripteur | `admissionFeature` | [admission.feature.ts](src/app/features/admission/admission.feature.ts) |
| Service | `CandidateService` (+ cache `detailCache`) | [candidate.service.ts](src/app/features/admission/services/candidate.service.ts) |
| Service | `AdmissionAcademicReferenceService` | [admission-academic-reference.service.ts](src/app/features/admission/services/admission-academic-reference.service.ts) |
| Store | `AdmissionSettingsStore` | [admission-settings.store.ts](src/app/features/admission/settings/services/admission-settings.store.ts) |
| Pages | `CandidateManagement`, `CandidateDetail` (1 376 l.), `CandidateCreate` (710 l.), `CandidatePortal` (778 l.), `AdmissionSettingsPage` | `pages/`, `settings/pages/` |
| Widgets | `CandidateStatsWidget`, `CandidateStatusStatsWidget` | `dashboard/components/` |
| Permissions | `AdmissionPermission` (6 clés) | [permission.model.ts](src/app/features/admission/permissions/permission.model.ts) |
| Modèles | `CandidateResponse`, `CandidateListItem`, `CandidatureStatus`, `CandidateDocument`, `SubmitCandidatureRequest`, `AdmissionSettings`… | `models/`, `settings/models/` |
| Utils | `candidate-format.ts` (formatage FR + sévérités) | [candidate-format.ts](src/app/features/admission/utils/candidate-format.ts) |
| Routes | `routes.ts` (`/admission`) + `settings/routes.ts` + route publique `/apply` déclarée dans [app.routes.ts:11](src/app.routes.ts#L11) | |

### Académique — `src/app/features/academic/`

| Type | Artefact | Fichier |
|---|---|---|
| Descripteur | `academicFeature` | [academic.feature.ts](src/app/features/academic/academic.feature.ts) |
| API publique | `academic.public-api.ts` (barrel exposant `AcademicCatalogService` + modèles de référence) | [academic.public-api.ts](src/app/features/academic/academic.public-api.ts) |
| Services (13) | `AcademicCatalogService`, `FacultyService`, `ProgramService`, `LevelService`, `CourseService`, `CourseUnitService`, `CourseAssignmentService`, `ProfessorService`, `ProfessorGradeService`, `StudentService`, `SemesterService`, `AcademicYearService` | `services/` |
| Pages (12) | `FacultyList`, `FacultyDetail` (622 l.), `CourseList`, `CourseDetail` (543 l.), `CourseUnitList`, `CourseUnitDetail`, `ProfessorList`, `ProfessorDetail` (655 l.), `StudentList`, `StudentDetail` (487 l.), `MyCourses`, `AcademicHomeRedirect` | `pages/` |
| Pages settings | `AcademicYearsPage`, `SemestersPage`, `LevelsPage`, `ProfessorGradesPage` | `settings/pages/` |
| Composants | `CourseEnrolledStudents`, `FacultyStatsWidget`, `ProfessorStatsWidget` | `components/`, `dashboard/components/` |
| ⚠️ Mort | `AcademicPlaceholder` | non référencé |
| Permissions | `AcademicPermission` (47 clés, groupées par ressource) | [permission.model.ts](src/app/features/academic/permissions/permission.model.ts) |
| Modèles (12) | `Faculty`, `Program`, `Level`, `Course`, `CourseUnit`, `CourseAssignment`, `Professor`, `ProfessorGrade`, `Student`, `Semester`, `AcademicYear`, `AcademicReference` | `models/` |
| Utils | `academic-http.ts` (`asList`, `refId`, `refName`, `refCode`), `academic-page.ts` (`toPaged`), `academic-date.ts` | `utils/` |

### layout & shared

| Type | Artefact | Fichier |
|---|---|---|
| Composants layout | `AppLayout`, `AppTopbar`, `AppSidebar`, `AppMenu`, `AppMenuitem`, `AppFooter`, `AppConfigurator` (463 l.), `AppFloatingConfigurator` | `layout/component/` |
| Service | `LayoutService` (thème, menu, persistance `localStorage`) | [layout.service.ts](src/app/layout/service/layout.service.ts) |
| Service | `DetailNavigationService` (navigation préc./suiv. via `sessionStorage`) | [detail-navigation.service.ts](src/app/shared/navigation/detail-navigation.service.ts) |
| Composants UI | `ContentSubtopbar`, `DashboardCard`, `DashboardStatCard` | `shared/ui/` |
| Utils | `avatar-url.ts` (`resolveAvatarUrl`, `getUserInitial`), `signed-url.ts` (`isSignedUrlExpiredOrExpiring`) | `shared/utils/` |

---

## 4. Points forts

### 4.1 Le registre `AppFeature` — un vrai système de modules

C'est la meilleure idée du projet. Chaque feature déclare tout son contrat dans un seul objet :

```ts
// src/app/features/admission/admission.feature.ts
export const admissionFeature: AppFeature = {
    key: 'admission', label: 'Admission', order: 20,
    route: { path: 'admission', loadChildren: () => import('./routes') },
    menu: [ /* entrées de sidebar avec permissions déclaratives */ ],
    settingsTab: { /* onglet Paramètres */ },
    settingsRoute: { path: 'admission', loadChildren: () => import('./settings/routes') },
    dashboardWidgets: admissionDashboardWidgets
};
```

Le registre ([app-feature.registry.ts:17-39](src/app/core/modules/app-feature.registry.ts#L17-L39)) agrège ensuite routes, menu, onglets et widgets par simple `flatMap` + tri sur `order`. Ajouter un module ne demande **aucune** modification du cœur. Le commentaire du §2 des conventions est tenu.

### 4.2 Permissions déclaratives cohérentes de bout en bout

Le même modèle `PermissionAwareItem` (`permissions` + `mode` + `hiddenWhenPermissions`) est réutilisé par **cinq** consommateurs différents, ce qui est une vraie réussite de conception :

- le guard de route — [permission.guard.ts:12-28](src/app/core/permissions/permission.guard.ts#L12-L28)
- le menu latéral — [app.menu.ts:78-118](src/app/layout/component/app.menu.ts#L78-L118)
- le shell de paramètres — [settings-shell.ts:33-47](src/app/core/settings/pages/settings-shell/settings-shell.ts#L33-L47)
- les widgets du dashboard — [dashboard.ts:23-32](src/app/pages/dashboard/dashboard.ts#L23-L32)
- les actions de sous-barre — [content-subtopbar.ts:37-44](src/app/shared/ui/content-subtopbar/content-subtopbar.ts#L37-L44)

Le mécanisme `hiddenWhenPermissions` est particulièrement bien pensé : il permet à un admin de ne pas voir « Mon dossier » ou « Mes cours », réservés aux profils restreints ([admission.feature.ts:30](src/app/features/admission/admission.feature.ts#L30)).

### 4.3 Interceptor d'authentification avec refresh mutualisé

[auth.interceptor.ts:46-68](src/app/core/auth/interceptors/auth.interceptor.ts#L46-L68) résout correctement le problème classique du « troupeau de refresh » : si dix requêtes reçoivent un 401 simultanément, un seul appel `/refresh-token` est émis, partagé via `shareReplay(1)` et nettoyé par `finalize`. Le `HttpContextToken PUBLIC_API_REQUEST` permet en outre d'exclure proprement les appels du portail public — un design nettement plus propre qu'une liste d'URL.

### 4.4 Rigueur TypeScript et templates modernes

- `strict` + 5 options de rigueur supplémentaires + 3 options Angular strictes, **toutes activées**.
- **6 occurrences de `any`** seulement, toutes localisées ([repartition_users.ts:39-40](src/app/features/identity/dashboard/components/repartition_users.ts#L39-L40), [app.configurator.ts:434-453](src/app/layout/component/app.configurator.ts#L434-L453), [app.menuitem.ts:108](src/app/layout/component/app.menuitem.ts#L108)).
- **Zéro `*ngFor`** : 100 % de syntaxe `@if`/`@for`, et **100 % des `@for` portent un `track`** sur une clé métier (`track section.title`, `track document.id`) — jamais `$index`.
- Permissions typées en `const object` + type dérivé, préférable à un `enum` TS pour l'interopérabilité JSON.

### 4.5 Normalisation défensive des réponses API

Le backend renvoie des formes variables (tableau nu ou page, `document_type` ou `type`, `status` à la racine ou sous `candidature`). Le projet gère cela explicitement :

- [academic-http.ts](src/app/features/academic/utils/academic-http.ts) — `asList()`, `refId()`, `refName()`, `refCode()` absorbent références plates ou imbriquées.
- [academic-page.ts:4-30](src/app/features/academic/utils/academic-page.ts#L4-L30) — `toPaged()` accepte `page`/`number`, `total_elements`/`totalElements`, snake_case ou camelCase.
- [signed-url.ts:17-57](src/app/shared/utils/signed-url.ts#L17-L57) — détection d'expiration des URLs présignées, gérant AWS SigV4 (`X-Amz-Date` + `X-Amz-Expires`) **et** `Expires` génériques, avec marge de sécurité.

### 4.6 Sécurisation correcte de la prévisualisation PDF

[candidate-detail.ts:296-315](src/app/features/admission/pages/candidate-detail/candidate-detail.ts#L296-L315) est un bon exemple d'usage de `bypassSecurityTrustResourceUrl` : l'URL est d'abord parsée, le protocole est **validé** (`http:`/`https:` uniquement), et toute exception retourne `null`. Le contournement du sanitizer n'intervient qu'après ces vérifications — exactement ce qu'il faut faire.

### 4.7 Documentation et outillage

`conventions_architecturales.md` (10 sections), `DESIGN.md` (tokens de design en front-matter YAML), `README.md`, scripts de seed (`tools/seed-smart-campus.mjs`), Docker de dev avec proxy dédié, Prettier + EditorConfig. L'effort de test est réel : **38 fichiers de specs / 214 specs**, avec des noms explicites mentionnant les techniques employées (« equivalence partitioning + boundary value analysis »).

### 4.8 Bons réflexes ponctuels de cycle de vie

Le pattern correct est connu et appliqué à certains endroits — [app.topbar.ts:86-95](src/app/layout/component/app.topbar.ts#L86-L95) et [student-detail.ts:270](src/app/features/academic/pages/student-detail/student-detail.ts#L270) utilisent bien `takeUntilDestroyed`. [auth.service.ts:206-213](src/app/core/auth/services/auth.service.ts#L206-L213) libère proprement son écouteur `storage` via `destroyRef.onDestroy`. Le problème n'est donc pas la méconnaissance du pattern mais son application incomplète (cf. §5).

---

## 5. Erreurs identifiées

**Récapitulatif : 2 critiques · 15 majeures · 22 mineures**

### 5.1 Critiques

| # | Module | Fichier:ligne | Description | Correction proposée |
|---|---|---|---|---|
| **C1** | Déploiement | [environment.production.ts:5](src/environments/environment.production.ts#L5), [nginx.conf](nginx.conf), [Dockerfile:22](Dockerfile#L22) | `apiBaseUrl: 'http://localhost:8085'` en production. L'image Docker sert le bundle via nginx **sans aucun proxy `/api`** (`grep -c api nginx.conf` → 0). Le navigateur du client appellera donc `http://localhost:8085`, c'est-à-dire **sa propre machine**. En HTTPS, s'ajoute un blocage *mixed content*. **L'artefact publié ne peut pas joindre l'API.** | Passer `apiBaseUrl: ''` (même origine) et ajouter un `location /api { proxy_pass http://backend:8085; }` dans `nginx.conf` ; ou injecter l'URL au runtime via un `config.json` chargé par `provideAppInitializer`. |
| **C2** | CI/CD | [.github/workflows/deploy.yml](.github/workflows/deploy.yml) | Le workflow enchaîne `checkout → metadata → buildx → login → build & push` : **aucune étape `npm run lint`, `npm test` ou vérification de type**. Tout push sur `master` publie sur Docker Hub. Par ailleurs `npm run test:ci` retourne `Statements : Unknown% (0/0)` (le navigateur crashe avant la collecte). Les règles `AGENTS.md` « Minimum coverage 90 % » et « Block merge if tests fail » sont **structurellement inapplicables**. | Ajouter un job `quality` bloquant (`npm ci && npm run lint && npm run test:ci && npm run build:prod`) en `needs` du job de build ; réparer le crash Karma (C2b) puis activer un seuil de couverture (`check_coverage` / `thresholds`). |

### 5.2 Majeures

| # | Module | Fichier:ligne | Description | Correction proposée |
|---|---|---|---|---|
| **M1** | core | [permission.service.ts:12](src/app/core/permissions/permission.service.ts#L12) | `getCurrentPermissions()` appelle `authService.getCurrentUser()`, qui lit **`localStorage`** ([auth.service.ts:98-111](src/app/core/auth/services/auth.service.ts#L98-L111)) et non le signal `currentUser`. Tous les `computed()` construits par-dessus n'ont donc **aucune dépendance réactive** : ils sont évalués une fois puis figés à vie. Cela contredit explicitement le §7 des conventions (« exposés via `computed(...)` pour un binding réactif »). Impactés : [faculty-scope.service.ts:11-17](src/app/core/auth/services/faculty-scope.service.ts#L11-L17), [dashboard.ts:23](src/app/pages/dashboard/dashboard.ts#L23), [content-subtopbar.ts:37](src/app/shared/ui/content-subtopbar/content-subtopbar.ts#L37), [faculty-detail.ts:91-111](src/app/features/academic/pages/faculty-detail/faculty-detail.ts#L91-L111), et tous les `can*` de pages. | Faire lire le signal : `getCurrentPermissions() { return this.authService.currentUser()?.authorities ?? []; }`. Correction d'une ligne qui rend réactive toute la chaîne. |
| **M2** | Admission | [admission-settings.store.ts:9](src/app/features/admission/settings/services/admission-settings.store.ts#L9), [candidate-create.ts:101](src/app/features/admission/pages/candidate-create/candidate-create.ts#L101), [candidate-create.html:59](src/app/features/admission/pages/candidate-create/candidate-create.html#L59) | L'ouverture du portail public est stockée **dans le `localStorage` de chaque navigateur**. La page publique `/apply` lit `isEnrollmentOpen()` depuis le `localStorage` **du visiteur** : n'ayant aucune clé, il retombe sur `DEFAULT_ADMISSION_SETTINGS` où `publicApplyEnabled: true` ([admission-settings.model.ts:12](src/app/features/admission/settings/models/admission-settings.model.ts#L12)). Un admin qui « ferme » les préinscriptions ne les ferme **que sur sa propre machine**, et même là il ne masque que l'UI — l'endpoint `POST /api/v1/candidates` reste appelable. *(Le commentaire « Persisted locally until API is available » montre que la limite est connue.)* | Déplacer ces réglages vers une API serveur (`GET/PUT /api/v1/admission/settings`) et faire appliquer la fenêtre d'inscription **côté backend**. En attendant, documenter clairement que le portail est ouvert en permanence. |
| **M3** | Sécurité | [auth.service.ts:246-268](src/app/core/auth/services/auth.service.ts#L246-L268), [nginx.conf](nginx.conf) | `access_token` et `refresh_token` sont stockés en `localStorage`, donc lisibles par tout JavaScript de la page : une XSS unique donne un vol de session **persistant** (le refresh token permet de régénérer indéfiniment). Aucun garde-fou en profondeur : `nginx.conf` ne définit **ni CSP, ni X-Frame-Options, ni HSTS, ni X-Content-Type-Options**. | Idéalement : refresh token en cookie `HttpOnly; Secure; SameSite=Strict`, access token en mémoire seule. À défaut, ajouter au minimum une CSP stricte et les en-têtes de sécurité dans `nginx.conf`. |
| **M4** | core | [auth.interceptor.ts:19](src/app/core/auth/interceptors/auth.interceptor.ts#L19) | `const isApiRequest = req.url.startsWith('/api/') \|\| req.url.includes('/api/')` — le premier test est redondant, et `includes()` matche **n'importe quelle URL absolue** contenant `/api/`, y compris un hôte tiers. Or [user.service.ts:115-122](src/app/features/identity/users/services/user.service.ts#L115-L122) et [candidate.service.ts:218-228](src/app/features/admission/services/candidate.service.ts#L218-L228) font un `PUT` vers une URL présignée S3/MinIO **sans marquer `PUBLIC_API_REQUEST`**. Si cette URL contient `/api/`, le `Bearer` est envoyé au fournisseur de stockage ; un 401 de sa part déclenche en plus un cycle refresh+retry. | Restreindre à l'origine de l'API (`req.url.startsWith(environment.apiBaseUrl + '/api/')` ou URL relative) **et** poser `PUBLIC_API_REQUEST` sur tous les `PUT` vers une URL présignée. |
| **M5** | Admission / Académique | [candidate.service.ts:65-66](src/app/features/admission/services/candidate.service.ts#L65-L66), [academic-catalog.service.ts:25-29](src/app/features/academic/services/academic-catalog.service.ts#L25-L29) | `CandidateService.detailCache` (`Map`) et les `shareReplay(1)` de `AcademicCatalogService` sont `providedIn: 'root'` et **ne sont jamais purgés à la déconnexion** : `AuthService.clearSession()` ([auth.service.ts:122-129](src/app/core/auth/services/auth.service.ts#L122-L129)) ne touche que le `localStorage`. Si un second utilisateur se connecte dans le même onglet, il peut se voir servir les dossiers candidats du précédent. S'ajoute une collision d'espaces de noms : la même `Map` mélange les clés `<id>`, `user:<id>` et `'me'` ([lignes 393-395](src/app/features/admission/services/candidate.service.ts#L393-L395)), donc un candidat dont l'id vaudrait `me` écraserait l'entrée courante. | Exposer un `reset()` sur chaque service porteur de cache et l'appeler depuis `clearSession()` (via un jeton `CACHE_RESETTERS` multi-provider). Séparer les caches par id / par utilisateur. |
| **M6** | Transverse | 9 fichiers (voir §6.3) | 9 souscriptions à des observables **non complétants** sans `takeUntilDestroyed` : `route.paramMap` dans [faculty-detail.ts:204](src/app/features/academic/pages/faculty-detail/faculty-detail.ts#L204), [professor-detail.ts:310](src/app/features/academic/pages/professor-detail/professor-detail.ts#L310), [student-detail.ts:276](src/app/features/academic/pages/student-detail/student-detail.ts#L276), [course-detail.ts:216](src/app/features/academic/pages/course-detail/course-detail.ts#L216), [user-detail.ts:183](src/app/features/identity/users/pages/user-detail/user-detail.ts#L183) ; `valueChanges` dans [course-list.ts:134,142,148](src/app/features/academic/pages/course-list/course-list.ts#L134-L148), [course-unit-list.ts:116,122](src/app/features/academic/pages/course-unit-list/course-unit-list.ts#L116-L122) ; `router.events` dans [app.menuitem.ts:141](src/app/layout/component/app.menuitem.ts#L141) et [settings-shell.ts:70](src/app/core/settings/pages/settings-shell/settings-shell.ts#L70). Le cas `app.menuitem.ts` est le plus coûteux : le composant est recréé à chaque ouverture/fermeture de sous-menu, chaque instance ajoutant un abonné permanent à `router.events`. `student-detail.ts` est révélateur — il utilise `takeUntilDestroyed` ligne 270 mais l'oublie ligne 276. | Ajouter `.pipe(takeUntilDestroyed(this.destroyRef))` sur chaque cas. Inscrire la règle dans `conventions_architecturales.md` §3 et activer une règle de lint dédiée. |
| **M7** | Identité | [user-create.ts:193-199](src/app/features/identity/users/pages/user-create/user-create.ts#L193-L199) vs [user-create.spec.ts:214-241](src/app/features/identity/users/pages/user-create/user-create.spec.ts#L214-L241) | La branche « contrainte unique sur email » renvoie désormais le **même texte générique** que la branche de repli lignes 215-219 (`'Un utilisateur avec ces informations existe déjà.'`), perdant le message spécifique à l'e-mail — alors que la branche `username` lignes 207-212 a conservé le sien. Les 2 assertions du spec échouent. | Rétablir un message spécifique (`fieldMessage: 'Cette adresse e-mail est déjà utilisée.'`, `toastMessage: 'Cette adresse e-mail est déjà associée à un compte.'`) ou mettre le spec à jour si la simplification est volontaire. Ne pas laisser un test rouge sur la branche. *(1 des 3 specs en échec ; les 2 autres relèvent de M15.)* |
| **M8** | Tests | [error.spec.ts](src/app/core/auth/error.spec.ts) | Ce fichier **déconnecte le navigateur à lui seul** (`Disconnected reconnect failed before timeout of 2000ms`), confirmé par bissection. Sur la suite complète, le crash survient à 160/214 : **54 specs ne s'exécutent jamais** et la couverture est non mesurable. Chaîne en cause : `Error` → `AppFloatingConfigurator` → `AppConfigurator.ngOnInit()` → `onPresetChange()` ([app.configurator.ts:117-121](src/app/layout/component/app.configurator.ts#L117-L121)). | Retirer `AppFloatingConfigurator` du composant `Error` (cf. m14), ou le remplacer par un stub dans le spec. Ajouter un `karma.conf.js` avec `browserDisconnectTimeout` / `browserNoActivityTimeout` relevés pour éviter qu'un spec lourd n'interrompe toute la suite. |
| **M9** | core | [settings/routes.ts:14](src/app/core/settings/routes.ts#L14) | `{ path: '', pathMatch: 'full', redirectTo: 'identity' }` est **inconditionnel**. Un admin Admission ou Académique qui ouvre `/settings` est redirigé vers `/settings/identity` → `permissionGuard` → `/access-denied`. Effet de bord : le bloc de repli intelligent de [settings-shell.ts:74-84](src/app/core/settings/pages/settings-shell/settings-shell.ts#L74-L84) (qui choisirait identity → admission → system → premier visible) est **du code mort**, puisque la redirection du routeur s'applique avant que `ngOnInit` ne voie l'URL `/settings`. | Remplacer le `redirectTo` statique par une fonction de redirection (`redirectTo: () => firstVisibleSettingsTab()`) ou un `CanActivateFn` retournant un `UrlTree`, et supprimer le bloc devenu inutile dans le shell. |
| **M10** | Admission | [candidate.service.ts:303-307](src/app/features/admission/services/candidate.service.ts#L303-L307) | `normalizeListItem()` fait un `throw new Error(...)` **à l'intérieur d'un `map()` RxJS** appliqué à `response.content.map(...)`. Un seul candidat sans `status` fait donc échouer **toute la liste paginée** — l'écran affiche « Impossible de charger les candidatures » au lieu des N-1 enregistrements valides. Même schéma lignes 335, 341, 366. | Filtrer les enregistrements invalides plutôt que de lever (`.map(...).filter(isValid)`), ou remplacer par un statut de repli et journaliser l'anomalie. |
| **M11** | core | [auth.guard.ts:5-14](src/app/core/auth/guards/auth.guard.ts#L5-L14), [login.ts:140](src/app/core/auth/login.ts#L140) | Le guard redirige vers `/auth/login` **sans conserver l'URL demandée**, et `Login.submit()` navigue systématiquement vers `/`. Un utilisateur arrivant sur un lien profond (`/academic/students/42`) est renvoyé à l'accueil après authentification. Par ailleurs `isAuthenticated()` ([auth.service.ts:118-120](src/app/core/auth/services/auth.service.ts#L118-L120)) accepte un access token **sans** refresh token, et `isAccessExpired()` retourne `false` quand `expires_at` est absent ([lignes 184-186](src/app/core/auth/services/auth.service.ts#L184-L186)) : un token périmé laisse donc passer le guard, et l'échec n'apparaît qu'au premier 401. | Passer `returnUrl` en query param (`router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } })`) et l'exploiter après login. Traiter l'absence d'expiration comme « expiré ». |
| **M12** | Architecture | [app-feature.registry.ts:2-5](src/app/core/modules/app-feature.registry.ts#L2-L5), [faculty-scope.service.ts:4](src/app/core/auth/services/faculty-scope.service.ts#L4) | **Inversion de dépendance** : `core/` importe `features/` en 7 endroits. Le plus discutable est `core/auth/faculty-scope.service.ts` qui importe `AcademicPermission` — un service d'authentification ne devrait pas connaître le domaine académique. Conséquence de performance : `app.routes.ts` importe statiquement `appFeatureRoutes`, qui importe les 3 `*.feature.ts`, qui importent les `dashboard.widgets.ts`, qui importent les **composants de widgets**. Tous les widgets du dashboard sont donc dans le **bundle initial**, quelles que soient les permissions. | Déplacer `FacultyScopeService` dans `features/academic/` (ou injecter la clé de permission). Rendre les widgets paresseux : `component: () => import('./components/x').then(m => m.X)` consommé par `NgComponentOutlet`. |
| **M13** | Transverse | 10 emplacements | Pagination **plafonnée en dur à `size=100`** sans indication à l'utilisateur : [academic-catalog.service.ts:133](src/app/features/academic/services/academic-catalog.service.ts#L133), [professor.service.ts:14,25,32](src/app/features/academic/services/professor.service.ts#L14-L32), [student.service.ts:83](src/app/features/academic/services/student.service.ts#L83), [professor-grade.service.ts:14](src/app/features/academic/services/professor-grade.service.ts#L14), [faculty-detail.ts:334](src/app/features/academic/pages/faculty-detail/faculty-detail.ts#L334), [repartition_users.ts:67](src/app/features/identity/dashboard/components/repartition_users.ts#L67), [identity-management.service.ts:23,45](src/app/features/identity/services/identity-management.service.ts#L23-L45). Au-delà de 100 facultés, professeurs ou étudiants, les listes sont **silencieusement tronquées** — un sélecteur de programme pourrait ne pas proposer l'entrée cherchée. `IdentityManagementService.getAllPrivileges()` ([lignes 52-68](src/app/features/identity/services/identity-management.service.ts#L52-L68)) montre pourtant le bon pattern de pagination complète. | Généraliser le pattern `getAllPrivileges()` (boucle sur `total_pages`) ou passer à une recherche serveur avec `p-select` en mode `filter` + `lazy`. |
| **M14** | Académique | [course.service.ts:16-18](src/app/features/academic/services/course.service.ts#L16-L18), [my-courses.ts:85](src/app/features/academic/pages/my-courses/my-courses.ts#L85), [course-detail.ts:409,430](src/app/features/academic/pages/course-detail/course-detail.ts#L409-L430) | `CourseService.findById()` **télécharge tous les cours** pour en retrouver un (`getAll().pipe(map(cs => cs.find(...)))`), alors que `getById` existe pour les autres ressources. S'y ajoutent des `subscribe` imbriqués : `my-courses.ts:82-89` (assignments → `getAll()` de tous les cours), `course-detail.ts:423-432` (faculté → cours). Ces imbrications empêchent l'annulation, sérialisent les appels et compliquent la gestion d'erreur. | Exposer un vrai `GET /courses/{id}`. Remplacer les imbrications par `switchMap` / `forkJoin` (ex. `resolveAttachedFaculty(...).pipe(switchMap(f => f ? this.courseService.getById(id) : EMPTY))`). |
| **M15** | Académique | [academic-home-redirect.ts:36,41](src/app/features/academic/pages/academic-home-redirect/academic-home-redirect.ts#L36-L41), [routes.ts:95,120](src/app/features/academic/routes.ts#L95-L120), [academic.feature.ts:64,71](src/app/features/academic/academic.feature.ts#L64-L71) | **Les rôles en lecture seule sont exclus du module Académique.** L'accès aux listes Professeurs et Étudiants exige partout `ProfessorUpdateAll` / `StudentUpdateAll` — dans le guard de route, dans le menu **et** dans la redirection d'accueil. Or les permissions `ProfessorReadAll` et `StudentReadAll` sont bien déclarées ([permission.model.ts:47,57](src/app/features/academic/permissions/permission.model.ts#L47-L57)) mais **ne sont utilisées nulle part dans l'implémentation** (`grep` : uniquement dans le spec). Un utilisateur porteur de `academic:professor:read:all` seul ne voit donc aucune entrée de menu, ne peut ouvrir aucune route, et `/academic` le renvoie sur `/access-denied`. **Les 2 specs en échec encodent précisément le comportement attendu** (lecture ⇒ accès à la liste), ce qui indique une régression ou une intention non implémentée. À noter que `CourseReadAll` et `FacultyReadAll` sont, eux, bien exploités ([course-list.ts:79](src/app/features/academic/pages/course-list/course-list.ts#L79), [faculty-detail.ts:145](src/app/features/academic/pages/faculty-detail/faculty-detail.ts#L145)) : l'incohérence est donc localisée aux professeurs et étudiants. | Accepter les deux niveaux en lecture : `permissions: [ProfessorReadAll, ProfessorUpdateAll], mode: 'any'` sur la route, le menu et la redirection (idem pour les étudiants), puis conditionner les actions d'écriture sur `*UpdateAll` dans la page. Trancher explicitement si un rôle lecture seule doit exister — et, si non, retirer les permissions `*ReadAll` de l'énumération et corriger les specs. |

### 5.3 Mineures

| # | Module | Fichier:ligne | Description | Correction proposée |
|---|---|---|---|---|
| m1 | core | [login.ts:86-96](src/app/core/auth/login.ts#L86-L96) | Le test `if (error.status === 0)` est **dupliqué** ; le second bloc (ligne 93) est inatteignable — son message n'est jamais affiché. | Supprimer le bloc mort ou fusionner les deux messages. |
| m2 | core | [login.ts:139](src/app/core/auth/login.ts#L139) | `const user = response.user;` jamais utilisé (erreur de lint). | Supprimer. |
| m3 | core | [login.ts:47](src/app/core/auth/login.ts#L47) | `checked = false` (« se souvenir de moi ») lié au template mais **jamais exploité** dans `submit()`. | Implémenter ou retirer la case à cocher. |
| m4 | Admission | [candidate-status-stats-widget.ts:3-4](src/app/features/admission/dashboard/components/candidate-status-stats-widget.ts#L3-L4) | 3 imports RxJS inutilisés (`forkJoin`, `of`, `catchError`). | Supprimer. |
| m5 | Académique | [academic-reference.model.ts:19](src/app/features/academic/models/academic-reference.model.ts#L19) | `interface FacultyReference extends AcademicReference {}` — interface vide équivalente à son parent. | `export type FacultyReference = AcademicReference;` |
| m6 | Académique | [student-detail.html:203](src/app/features/academic/pages/student-detail/student-detail.html#L203) | Comparaison faible `!=` dans un template. | Utiliser `!==`. |
| m7 | Environnements | [environment.development.ts:8](src/environments/environment.development.ts#L8) | `SMARTCAMPUS_API_PASSWORD : 'admin@password'` **committé** dans le dépôt. La clé n'est référencée nulle part dans `src/` (vérifié par `grep`) — c'est un résidu, mais un mot de passe en clair dans l'historique Git reste à traiter. | Supprimer la clé ; si elle a servi, faire tourner le secret côté backend. |
| m8 | Environnements | [environment.ts:4](src/environments/environment.ts#L4), [environment.production.ts:4](src/environments/environment.production.ts#L4), [environment.development.ts:4](src/environments/environment.development.ts#L4) | Faute de frappe `univesity` (au lieu de `university`) propagée dans les 3 fichiers et consommée telle quelle par [app-brand.ts:5](src/app/core/config/app-brand.ts#L5). | Renommer partout en `university`. |
| m9 | Environnements | [environment.ts](src/environments/environment.ts) | `environment.ts` est un **duplicata exact** de `environment.production.ts`. Comme `tsconfig.spec.json` n'applique aucun `fileReplacements`, **les tests tournent avec la configuration de production** (`apiBaseUrl: 'http://localhost:8085'`, `enableDebug: false`). | Faire de `environment.ts` la base de développement, ou ajouter un `environment.test.ts` explicite. |
| m10 | Identité | [user-password/user-password.ts](src/app/features/identity/pages/user-password/user-password.ts) | Composant **non référencé** (aucune route, aucun import) — 1 page complète de changement de mot de passe morte. | Brancher sur une route ou supprimer. |
| m11 | Identité / Académique | [identity-placeholder.ts](src/app/features/identity/pages/identity-placeholder/identity-placeholder.ts), [academic-placeholder.ts](src/app/features/academic/pages/academic-placeholder/academic-placeholder.ts) | Composants d'échafaudage **non référencés**. | Supprimer. |
| m12 | Identité | [user-form/user-form.ts](src/app/features/identity/users/components/user-form/user-form.ts), [stat-card/stat-card.ts](src/app/features/identity/dashboard/components/stat-card/stat-card.ts) | Composants **non référencés** (le second est doublonné par `shared/ui/dashboard/dashboard-stat-card`). | Supprimer ou consolider. |
| m13 | core | [Pipes.ts](src/app/core/services/Pipes.ts) | `FirstCharPipe` **non utilisé**. Le fichier est de plus mal nommé et mal placé (`PascalCase` pluriel dans `core/services/`, alors que les conventions §10 imposent le kebab-case). | Supprimer, ou déplacer en `shared/pipes/first-char.pipe.ts`. |
| m14 | layout | [app.configurator.ts](src/app/layout/component/app.configurator.ts) (463 l.) | Le configurateur de thème n'est atteignable que via `AppFloatingConfigurator`, lui-même utilisé **uniquement** par [error.ts:9](src/app/core/auth/error.ts#L9) — soit 463 lignes accessibles depuis la seule page `/auth/error`. Probablement aussi la cause du crash de la suite de tests (M8). | Retirer du composant d'erreur, ou brancher le configurateur sur la topbar si la fonctionnalité est voulue. |
| m15 | layout | [app.menuitem.ts:211](src/app/layout/component/app.menuitem.ts#L211), [app.sidebar.ts:73,86](src/app/layout/component/app.sidebar.ts#L73-L86) | `staticMenuMobileActive` est écrit dans `layoutState` mais **n'existe pas** dans l'interface `LayoutState` ([layout.service.ts:11-18](src/app/layout/service/layout.service.ts#L11-L18)) et n'est jamais lu. Propriété fantôme (sans impact : `mobileMenuActive` est bien positionné à côté). | Supprimer les 3 occurrences. |
| m16 | layout | [layout.service.ts:65,74](src/app/layout/service/layout.service.ts#L65-L74) | `saveConfig(config)` est appelé **deux fois** dans le même `effect`. | Ne conserver qu'un appel. |
| m17 | layout | [app.menuitem.ts:148,154](src/app/layout/component/app.menuitem.ts#L148-L154) | `ngOnInit` / `ngAfterViewInit` déclarés **sans implémenter** `OnInit` / `AfterViewInit` (la règle `use-lifecycle-interface` est désactivée dans le lint). | Implémenter les interfaces et réactiver la règle. |
| m18 | core | [guest.guard.ts:5](src/app/core/auth/guards/guest.guard.ts#L5) | `guestGuard` est typé `CanActivateChildFn` mais utilisé en `canActivate` ([auth.routes.ts:12-14](src/app/core/auth/auth.routes.ts#L12-L14)). Les deux signatures étant identiques cela compile, mais l'intention est brouillée. | Typer en `CanActivateFn`, ou appliquer en `canActivateChild` sur une route parente. |
| m19 | core | [auth.interceptor.ts:11](src/app/core/auth/interceptors/auth.interceptor.ts#L11) | `let refreshRequest$` est un **état mutable au niveau du module**, partagé entre tous les injecteurs. Fonctionnel en production (un seul injecteur racine), mais source de fuite d'état entre tests. | Déplacer dans un service `providedIn: 'root'`. |
| m20 | Académique | [academic.feature.ts:8-9,79](src/app/features/academic/academic.feature.ts#L8-L9) | `key: 'Academique'` (les autres clés sont en minuscules : `identity`, `admission`, `system`) et libellés mélangeant français et anglais — menu `'Academique'` (sans accent) vs onglet de paramètres `'Academic'`. | Normaliser : `key: 'academic'`, libellé `'Académique'` partout. |
| m21 | core | [error.ts](src/app/core/auth/error.ts) | La classe s'appelle `Error`, **masquant le type global `Error`** dans tout fichier qui l'importe ([auth.routes.ts:4](src/app/core/auth/auth.routes.ts#L4)). | Renommer en `ErrorPage`. |
| m22 | Transverse | [settings-storage.util.ts:14-16](src/app/core/settings/services/settings-storage.util.ts#L14-L16), [detail-navigation.service.ts:92-99](src/app/shared/navigation/detail-navigation.service.ts#L92-L99) | `writeJsonStorage` et `writeAll` accèdent à `localStorage`/`sessionStorage` **sans `try/catch` ni garde `typeof`**, contrairement à `AuthService` et `LayoutService` qui protègent chaque accès. En navigation privée Safari ou en cas de quota dépassé, l'écriture lève et casse l'appelant. Accessoirement, `AdmissionSettingsStore.reset()` ([ligne 68](src/app/features/admission/settings/services/admission-settings.store.ts#L68)) retourne la **référence partagée** `DEFAULT_ADMISSION_SETTINGS` au lieu d'une copie. | Envelopper les écritures dans `try/catch` et aligner sur les gardes de `AuthService` ; retourner `{ ...DEFAULT_ADMISSION_SETTINGS }`. |

---

## 6. Points à améliorer par axe

### 6.1 Architecture et organisation

**Problème — inversion de dépendance `core → features`.** Sept imports remontent de `core/` vers `features/` :

```
core/modules/app-feature.registry.ts:3-5   → admission.feature, identity.feature, academic.feature
core/auth/services/faculty-scope.service.ts:4 → features/academic/permissions
core/settings/core.feature.ts:2            → features/identity/permissions
core/settings/system.routes.ts:3           → features/identity/permissions
core/settings/pages/system-settings/system-settings.ts:10 → features/academic/services
```

**Impact.** Pour le registre, c'est un choix assumé et acceptable (il faut bien un point d'assemblage). Mais `core/auth/faculty-scope.service.ts` important `AcademicPermission` signifie que le module d'authentification **ne peut plus être extrait sans le module académique**, et rend tout test de `core/auth` dépendant du domaine métier.

**Recommandation.** Déplacer `FacultyScopeService` vers `features/academic/services/`, ou l'abstraire :

```ts
// core/auth — sans connaissance du domaine
export const FACULTY_SCOPE_PERMISSIONS = new InjectionToken<{ own: string; all: string }>('faculty-scope');
// features/academic — fournit la configuration
{ provide: FACULTY_SCOPE_PERMISSIONS, useValue: { own: AcademicPermission.FacultyReadOwn, all: AcademicPermission.FacultyReadAll } }
```

**Problème secondaire — couplage inter-features incohérent.** Le projet se dote d'une API publique (`academic.public-api.ts`) mais ne l'utilise pas systématiquement : [admission-academic-reference.service.ts:3](src/app/features/admission/services/admission-academic-reference.service.ts#L3) passe bien par le barrel, tandis que [candidate-management.ts:51](src/app/features/admission/pages/candidate-management/candidate-management.ts#L51) importe `FacultyService` en direct, et [faculty-detail.ts:19](src/app/features/academic/pages/faculty-detail/faculty-detail.ts#L19) importe `UsersService` d'Identité en direct — alors qu'Identité n'expose aucune API publique.

**Recommandation.** Créer `identity.public-api.ts`, y exposer ce qui est réellement partagé, et interdire les imports profonds inter-features via `eslint-plugin-import` (`no-restricted-paths`).

**Dossiers vides.** `core/http/`, `core/module-registry/`, `core/state/`, `shared/forms/`, `shared/models/` ne contiennent qu'un `.gitkeep`. `core/module-registry/` est de plus redondant avec `core/modules/` qui contient le vrai registre.

### 6.2 Routing

| Sujet | Constat |
|---|---|
| **Lazy loading** | ✅ Correct au niveau feature (`loadChildren: () => import('./routes')`) + `/apply` en `loadComponent`. 38 chunks paresseux générés. |
| **Granularité** | ⚠️ À l'intérieur d'une feature, tout est importé **statiquement** ([academic/routes.ts:4-15](src/app/features/academic/routes.ts#L4-L15) importe 12 pages). Le chunk académique embarque donc les 12 pages dès la première visite. |
| **Guards** | ✅ `authGuard` sur le shell, `permissionGuard` + `data.permissions` sur **chaque** route protégée, `guestGuard` sur les routes d'authentification. Couverture complète. |
| **Resolvers** | ❌ Aucun (assumé au §9 des conventions). Le chargement en `ngOnInit` provoque un flash de page vide. |
| **404** | ✅ `{ path: '**', redirectTo: '/notfound' }` + composant `Notfound`. |
| **Routes orphelines** | ⚠️ `/auth/access` ([auth.routes.ts:10](src/app/core/auth/auth.routes.ts#L10)) fait doublon avec `/access-denied` ([app.routes.ts:24](src/app.routes.ts#L24)) — deux routes pour le même composant `Access`, et seule la seconde est ciblée par `permissionGuard`. |
| **Redirection `/settings`** | ❌ Cassée pour les non-admins Identité (cf. M9). |
| **`returnUrl`** | ❌ Absent (cf. M11). |

**Recommandation** — passer les pages en `loadComponent` :

```ts
{ path: 'faculties', loadComponent: () => import('./pages/faculty-list/faculty-list').then(m => m.FacultyListPage), ... }
```

Et remplacer `AcademicHomeRedirect` (un composant à template vide dont le seul rôle est de rediriger, [academic-home-redirect.ts](src/app/features/academic/pages/academic-home-redirect/academic-home-redirect.ts)) par la fonction de redirection native d'Angular, qui évite un cycle de rendu :

```ts
{ path: '', redirectTo: () => { /* logique de permissions → string | UrlTree */ } }
```

### 6.3 Composants

**Taille excessive.** Quatre composants dépassent largement le seuil raisonnable :

| Composant | Lignes | Observation |
|---|---|---|
| [candidate-detail.ts](src/app/features/admission/pages/candidate-detail/candidate-detail.ts) | **1 376** | ~20 signals, `detailSections` construit 4 sections × ~14 lignes de libellés en dur dans un `computed`, gestion du rafraîchissement d'URLs présignées, dialogues de validation/rejet, prévisualisation de documents |
| [candidate-portal.ts](src/app/features/admission/pages/candidate-portal/candidate-portal.ts) | 778 | 13 souscriptions |
| [candidate-create.ts](src/app/features/admission/pages/candidate-create/candidate-create.ts) | 710 | Formulaire à 30 champs + validation téléphonique `libphonenumber-js` |
| [professor-detail.ts](src/app/features/academic/pages/professor-detail/professor-detail.ts) | 655 | 12 souscriptions |

**Recommandation** pour `candidate-detail.ts` : extraire la construction de `detailSections` dans un `candidate-detail-sections.ts` pur (facilement testable), la logique de rafraîchissement des URLs présignées dans un service, et la prévisualisation dans un composant `<app-document-preview>`. Ce fichier ne devrait pas dépasser 300 lignes.

**`OnPush` : 0 composant sur 64.** À nuancer : l'application étant en `provideZonelessChangeDetection()`, la détection n'est déclenchée que par les signals et les événements, ce qui limite fortement l'impact. Cela reste toutefois un gain gratuit sur les arbres de composants profonds (listes, tables) où `Default` force la traversée de sous-arbres propres.

**Recommandation.** Ajouter `changeDetection: ChangeDetectionStrategy.OnPush` en priorité sur les composants de liste et les widgets. Une fois généralisé, activer `@angular-eslint/prefer-on-push-component-change-detection`.

**API de composants — bon usage global.** Les composants récents utilisent la fonction `input()` moderne ([content-subtopbar.ts:33-35](src/app/shared/ui/content-subtopbar/content-subtopbar.ts#L33-L35)). Exception : [app.menuitem.ts:108](src/app/layout/component/app.menuitem.ts#L108) — `item = input<any>(null)` perd tout typage sur un composant central. Le type `FeatureMenuItem` existe pourtant déjà.

**Données factices en dur.** [app.topbar.ts:62,102-138](src/app/layout/component/app.topbar.ts#L62-L138) — `notificationCount = 5` et 5 notifications fictives (« Nouvelle demande de création utilisateur »…). `notificationMenuItems` et `toggleDarkMode()` **ne sont référencés nulle part dans le template** : code mort visible dans le bundle initial.

### 6.4 Services et gestion d'état

**Points positifs.** Tous les services sont `providedIn: 'root'` avec `inject()` (pas de constructeur), l'URL suit un motif unique `${environment.apiBaseUrl}/api/v1/<ressource>`, et le pattern de store signal (`state` privé + `asReadonly()` + `computed` + mutations explicites) est propre et bien documenté.

**Problème 1 — réactivité rompue.** Traité en M1. C'est *le* correctif à fort effet de levier : une ligne dans `PermissionService` rend réactive toute la chaîne de permissions de l'application.

**Problème 2 — cache sans invalidation ni durée de vie.** `AcademicCatalogService` mémoïse via `shareReplay(1)` et n'offre que des invalidations manuelles ([lignes 136-151](src/app/features/academic/services/academic-catalog.service.ts#L136-L151)), qu'il faut penser à appeler (`invalidatePrograms()` l'est bien depuis [faculty-detail.ts:305](src/app/features/academic/pages/faculty-detail/faculty-detail.ts#L305), mais rien ne le garantit ailleurs). `shareReplay(1)` sans `refCount: true` maintient de plus la souscription source indéfiniment.

**Recommandation.** Utiliser `shareReplay({ bufferSize: 1, refCount: true })` et envisager `httpResource()` (Angular 21) qui apporte nativement cache, rechargement et état de chargement sous forme de signals.

**Problème 3 — état temporel dans un `computed`.** [admission-settings.store.ts:13-31](src/app/features/admission/settings/services/admission-settings.store.ts#L13-L31) — `isEnrollmentOpen` lit `Date.now()`, qui n'est pas réactif : le `computed` ne se réévaluera **jamais** quand la fenêtre d'inscription s'ouvre ou se ferme pendant que la page est ouverte.

### 6.5 RxJS

**Fuites de mémoire.** 9 cas documentés en M6. À noter que **35 fichiers sur 175** contiennent un `.subscribe()` sans `takeUntilDestroyed` ; la majorité concerne des requêtes HTTP qui complètent d'elles-mêmes (donc pas des fuites au sens strict), mais elles ne sont pas **annulées** à la navigation : une réponse tardive vient écrire dans les signals d'un composant détruit, et déclenche un toast d'erreur sur une page qui n'existe plus.

**`subscribe` imbriqués.** Trois cas confirmés (M14). Anti-pattern qui empêche l'annulation et sérialise inutilement les appels.

**Absence de `async` pipe.** Choix assumé au §3 des conventions (« sans `async pipe` systématique »). C'est cohérent avec l'approche signal-first, mais les conventions devraient alors **imposer explicitement** `takeUntilDestroyed` — c'est précisément ce garde-fou qui manque.

**Recommandation.** Exploiter `rxResource()` / `httpResource()` (Angular 21), qui suppriment le problème à la racine en liant le cycle de vie de la requête à celui du composant :

```ts
// avant — faculty-detail.ts:204 : fuite + gestion manuelle du chargement
this.route.paramMap.subscribe((params) => { /* ... */ });

// après — annulation et état de chargement gérés par le framework
private readonly id = toSignal(this.route.paramMap.pipe(map(p => p.get('id'))));
readonly faculty = httpResource<Faculty>(() => this.id() ? `/api/v1/faculties/${this.id()}` : undefined);
```

**Gestion d'erreur inégale.** De nombreux `subscribe({ next: ... })` n'ont **aucun handler `error`** — notamment [faculty-detail.ts:192-197](src/app/features/academic/pages/faculty-detail/faculty-detail.ts#L192-L197) (chargement des niveaux), [course-detail.ts:212,368,449,459,472](src/app/features/academic/pages/course-detail/course-detail.ts#L212-L472), [course-list.ts:291,347](src/app/features/academic/pages/course-list/course-list.ts#L291-L347), [faculty-stats-widget.ts:34](src/app/features/academic/dashboard/components/faculty-stats-widget.ts#L34). En cas d'échec, l'erreur remonte non gérée : l'utilisateur voit un sélecteur vide sans explication.

**Recommandation.** Ajouter un `errorInterceptor` global qui journalise et affiche un toast pour tout échec non traité — la couche `core/http/` prévue mais vide est l'endroit désigné.

### 6.6 HTTP et API

| Sujet | Constat |
|---|---|
| **Centralisation** | ✅ Aucun `fetch`/`XMLHttpRequest` direct ; tous les appels passent par des services dédiés. |
| **URLs** | ✅ Motif cohérent `${environment.apiBaseUrl}/api/v1/...`, aucune URL en dur dans un composant. |
| **Typage** | ⚠️ Deux styles cohabitent : typage direct (`http.get<Faculty[]>`) et `http.get<unknown>` + normalisation (`ProfessorService`, `StudentService`). Le second est plus robuste ; le premier fait **confiance aveugle** au backend. |
| **Interceptor token** | ✅ Présent, avec refresh mutualisé. ⚠️ Détection d'URL trop large (M4). |
| **Interceptor erreurs** | ❌ Absent — chaque composant duplique `error.error?.detail ?? 'message par défaut'` (~40 occurrences). |
| **Interceptor loading** | ❌ Absent — chaque page gère son propre `loading = signal(false)`. |
| **Gestion d'erreur** | ⚠️ Inégale (cf. §6.5). |

**Recommandation.** Créer `core/http/error.interceptor.ts` et `core/http/loading.interceptor.ts`, et un helper partagé :

```ts
// core/http/api-error.ts
export function apiErrorDetail(error: unknown, fallback: string): string {
    return error instanceof HttpErrorResponse ? (error.error?.detail ?? fallback) : fallback;
}
```

### 6.7 Formulaires

**Points positifs.** `FormBuilder.nonNullable.group` est utilisé systématiquement pour les formulaires d'édition, ce qui donne un typage fort et évite les `| null` parasites. Les validateurs sont riches et bien placés — [candidate-create.ts:127-181](src/app/features/admission/pages/candidate-create/candidate-create.ts#L127-L181) enchaîne `required`, `maxLength`, `email`, `min`/`max`, plus des validateurs personnalisés pour les numéros de téléphone via `libphonenumber-js`. Les contrôles dépendants sont correctement désactivés au départ (`program_id`, `level_id` en `{ value: '', disabled: true }`). La gestion des erreurs serveur 400 `invalid_fields` dans un `signal<Record<string, string>>` est un bon pattern, appliqué uniformément.

**Problème — incohérence sur le formulaire de connexion.** [login.ts](src/app/core/auth/login.ts) utilise `FormsModule` avec des champs nus (`email = ''`, `password = ''`) et s'appuie sur `form.reportValidity()` ([ligne 125](src/app/core/auth/login.ts#L125)), c'est-à-dire la validation **HTML native** et ses bulles navigateur non stylables et non traduisibles. Le §5 des conventions autorise le template-driven « pour les forms simples », mais ici cela crée une expérience visuellement différente du reste de l'application sur l'écran le plus vu.

**Recommandation.** Passer `login` en reactive form pour aligner l'affichage des erreurs sur les autres écrans.

**Problème — validateur de mot de passe trop restrictif.** [user-password.ts:31-39](src/app/features/identity/pages/user-password/user-password.ts#L31-L39) impose `maxLength(16)` et un jeu de caractères spéciaux **fermé** (`[@$!%*?&]`). Cela bloque les phrases de passe et les gestionnaires de mots de passe, et contredit les recommandations NIST SP 800-63B actuelles. *(Composant par ailleurs non branché — cf. m10.)*

### 6.8 Sécurité

| Sujet | Constat |
|---|---|
| **Stockage des tokens** | ❌ `localStorage` — vulnérable au vol persistant par XSS (M3). |
| **Contrôle d'accès par rôle** | ✅ Solide **côté UI** : `permissionGuard` sur toutes les routes, filtrage déclaratif du menu, des onglets, des widgets et des actions. |
| **Défense en profondeur** | ⚠️ Le périmètre faculté ([candidate-management.ts:216](src/app/features/admission/pages/candidate-management/candidate-management.ts#L216)) est envoyé comme **paramètre de requête** `facultyId`. C'est un filtre d'affichage, pas une frontière d'autorisation : le backend **doit** le réappliquer côté serveur. |
| **`innerHTML`** | ✅ Aucune occurrence dans tout le projet. |
| **`bypassSecurityTrust*`** | ✅ 2 usages, tous deux précédés d'une validation de protocole ([candidate-detail.ts:296-315](src/app/features/admission/pages/candidate-detail/candidate-detail.ts#L296-L315), [candidate-portal.ts:181](src/app/features/admission/pages/candidate-portal/candidate-portal.ts#L181)). |
| **Secrets** | ❌ `SMARTCAMPUS_API_PASSWORD` committé (m7). |
| **En-têtes de sécurité** | ❌ Aucun (ni CSP, ni HSTS, ni X-Frame-Options) dans `nginx.conf`. |
| **HTTPS** | ❌ `apiBaseUrl: 'http://...'` en production. |
| **Fuite de token** | ⚠️ Détection d'URL trop permissive dans l'interceptor (M4). |
| **Purge à la déconnexion** | ❌ Caches applicatifs conservés (M5). |

**Recommandation `nginx.conf`** (illustration) :

```nginx
add_header Content-Security-Policy "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline' https://fonts.cdnfonts.com; font-src 'self' https://fonts.cdnfonts.com; connect-src 'self'" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
location /api/ { proxy_pass http://backend:8085; proxy_set_header Host $host; }
```

> Note : `index.html` charge une police depuis `https://fonts.cdnfonts.com` ([index.html:18](src/index.html#L18)) — un CDN tiers sans `integrity` ni `crossorigin`. À héberger localement pour supprimer cette dépendance externe et la relâcher dans la CSP.

### 6.9 Performance

**Bundle.** 940,51 kB brut / 231,52 kB transféré en initial — sous le budget de 1 Mo, mais à **92 %** du seuil d'alerte : la marge est faible pour les 3 prochains modules.

**Problème 1 — widgets du dashboard dans le bundle initial.** Traité en M12. La chaîne `app.routes.ts → app-feature.registry.ts → *.feature.ts → dashboard.widgets.ts → composants de widgets` est entièrement statique. `RepartitionUsers` importe `chart.js` (~250 kB) ; ce poids est supporté par **tous** les utilisateurs, y compris ceux sans la permission `identity:user:read:all`.

**Recommandation.** Rendre `DashboardWidget.component` paresseux :

```ts
export interface DashboardWidget {
    // ...
    component: () => Promise<Type<unknown>>;   // au lieu de Type<unknown>
}
// dashboard.widgets.ts
component: () => import('./components/repartition_users').then(m => m.RepartitionUsers)
```

`NgComponentOutlet` accepte un composant résolu de façon asynchrone ; seule la déclaration change.

**Problème 2 — pages non paresseuses dans les chunks de features.** Le chunk `candidate-create` pèse à lui seul 258,91 kB (`libphonenumber-js` + `quill` + PrimeNG Stepper). Il est correctement isolé, mais les 12 pages académiques sont regroupées dans un seul chunk de 157,46 kB.

**Problème 3 — requêtes surdimensionnées.** `CourseService.findById()` télécharge le catalogue complet pour un seul cours (M14), et `my-courses.ts:85` fait de même pour résoudre les libellés de quelques affectations.

**Problème 4 — `FacultyService.resolveAttachedFaculty()`.** [faculty.service.ts:49-78](src/app/features/academic/services/faculty.service.ts#L49-L78) : sans `facultyId`, la méthode charge **toutes** les facultés puis émet un `forkJoin` d'un appel `getLeadership()` **par faculté** — soit N+1 requêtes. Appelé au chargement de `/academic/my-faculty` ([faculty-detail.ts:234](src/app/features/academic/pages/faculty-detail/faculty-detail.ts#L234)).

**Recommandation.** Exposer côté API un `GET /api/v1/faculties/me` (ou `?leaderUserId=`) et supprimer le repli en N+1.

**Points positifs.** `track` sur 100 % des boucles ; 20/20 tables PrimeNG configurées en `scrollable`/`responsiveLayout` ; `withFetch()` et `withEnabledBlockingInitialNavigation()` correctement activés ; `outputHashing: 'all'` en production.

### 6.10 Qualité et maintenabilité

**Tests.** L'effort est réel (38 fichiers, 214 specs, avec une démarche explicite de partitionnement d'équivalence), mais l'exécution est cassée (M8) et la répartition très inégale :

| Zone | Sources | Specs | Couverture apparente |
|---|---|---|---|
| `core/auth` | 14 | 8 | 🟢 bonne |
| `core/permissions` | 3 | 2 | 🟢 bonne |
| `core/settings` | 8 | **0** | 🔴 nulle |
| `features/identity` | 24 | 3 | 🔴 faible |
| `features/admission` | 18 | 4 | 🟠 faible |
| `features/academic` | 53 | 14 | 🟠 moyenne |
| `layout` | 9 | 3 | 🟠 moyenne |
| `pages` (dashboard) | 3 | **0** | 🔴 nulle |

**16 services sur 18 n'ont aucun spec**, dont les plus critiques : `CandidateService` (484 lignes, toute la normalisation et le cache), `AcademicCatalogService` (cache), `UsersService`, `IdentityManagementService`, `FacultyScopeService`, `DetailNavigationService`. **21 composants de page** n'ont aucun spec, dont `CandidatePortal` (778 l.) et `FacultyDetail` (622 l.).

**Recommandation priorisée** — cibler les services à logique pure, où le rapport valeur/effort est maximal : `CandidateService.normalizeCandidate/normalizeListItem` (cas limites de M10), `AcademicCatalogService` (comportement du cache et de l'invalidation), `FacultyScopeService` (matrice de périmètre), `toPaged()` et `asList()`.

**Lint.** 6 erreurs à corriger, mais surtout **13 règles désactivées**. Les 6 règles d'accessibilité coupées côté template font que le lint ne peut structurellement pas détecter les problèmes d'a11y du §6.11.

**Duplication.** Le pattern `buildPageableParams` est réimplémenté à l'identique dans [user.service.ts:28-46](src/app/features/identity/users/services/user.service.ts#L28-L46), [user.service.ts:48-66](src/app/features/identity/users/services/user.service.ts#L48-L66) et [identity-management.service.ts:92-108](src/app/features/identity/services/identity-management.service.ts#L92-L108) — trois copies dont deux dans le même fichier. De même, `PagedResponse<T>` est redéclaré dans `user.service.ts`, `identity-management.model.ts`, `candidate.model.ts` et `academic-reference.model.ts`.

**Recommandation.** Un seul `shared/models/paged-response.ts` et un `shared/http/pageable-params.ts`. Les dossiers `shared/models/` et `shared/forms/` sont d'ailleurs déjà créés et vides.

**Hygiène du dépôt.**

- `login.json` à la racine ([login.json](login.json)) — une **réponse d'erreur API** (`{"detail":"The request body is missing...","status":400}`) committée par accident (commit `4910e94`).
- `.tools/` contient **70 Mo de binaires Windows** versionnés (`cloudflared.exe`, `ngrok.exe`), ce qui alourdit durablement l'historique.
- `conventions_architecturales.md` §7 affirme que `PermissionService` lit « sessionStorage via AuthService », alors que le code utilise `localStorage` depuis le commit `0582520`. Dérive de documentation.

### 6.11 UI/UX

**Points positifs.** Design system cohérent et documenté (`DESIGN.md` avec tokens en front-matter, preset PrimeNG `UNHPreset` dérivé d'Aura). Mode sombre complet avec transition `document.startViewTransition()` et repli gracieux ([layout.service.ts:143-157](src/app/layout/service/layout.service.ts#L143-L157)). `lang="fr"` correctement posé sur `<html>`. Les 20 tables sont responsive, et 8 fichiers SCSS définissent des points de rupture explicites.

**Accessibilité — partielle.**

| Sujet | Constat |
|---|---|
| `<label for="...">` | 🟠 116 sur 161 `<label>` portent un `for` — **45 labels non associés**. |
| `aria-label` | 🟠 17 fichiers HTML sur 40 en contiennent. |
| Règles de lint a11y | ❌ 6 désactivées : `click-events-have-key-events`, `interactive-supports-focus`, `alt-text`, `no-autofocus`, `elements-content`, `prefer-control-flow`. |
| Navigation clavier | ⚠️ [app.menuitem.ts:17,30](src/app/layout/component/app.menuitem.ts#L17-L30) — des `<a>` avec `(click)` et `tabindex="0"` mais **sans gestionnaire clavier** : le menu n'est pas activable au clavier. |
| Focus visible | ⚠️ Non vérifié systématiquement. |

**Recommandation.** Réactiver progressivement les règles a11y (commencer par `alt-text` et `label-has-associated-control`), et ajouter `(keydown.enter)`/`(keydown.space)` aux éléments interactifs d'`app.menuitem.ts`.

**Internationalisation — absente.** `grep -rn "i18n|\$localize"` sur `src/` ne renvoie **aucun** résultat. Toutes les chaînes sont du français codé en dur (~500 occurrences), y compris les messages d'erreur dans les services. `angular.json` déclare pourtant une cible `extract-i18n` inutilisée. Pour une université, le besoin FR/EN est probable.

**Recommandation.** Si l'i18n est au programme, l'introduire **maintenant** : chaque nouveau module multiplie le coût de reprise. La première étape (marquer les templates en `i18n`) est mécanique ; extraire les chaînes des fichiers `.ts` l'est beaucoup moins.

**Incohérences de libellés.** Menu « Academique » (sans accent) vs onglet de paramètres « Academic » (anglais) vs `label: 'Académique'` attendu (m20). Tutoiement isolé dans [user-create.ts:146](src/app/features/identity/users/pages/user-create/user-create.ts#L146) (« Tu n'as pas les privilèges ») alors que tout le reste de l'application vouvoie.

---

## 7. Analyse détaillée par module

### 7.1 Module Identité

**Périmètre.** Utilisateurs, profils métier, rôles, privilèges, profil personnel, préférences, avatar. 24 fichiers source, 15 composants, 2 services, 16 permissions.

**Organisation.** Le module opère une séparation intéressante entre **compte personnel** (`/identity/profile`, `/identity/preferences` — [routes.ts](src/app/features/identity/routes.ts)) et **administration** (`/settings/identity/*` — [routes.admin.ts](src/app/features/identity/routes.admin.ts)), avec des redirections de compatibilité pour les anciennes URLs ([routes.ts:20-25](src/app/features/identity/routes.ts#L20-L25)). C'est propre et bien documenté par des commentaires. `identityFeature` déclare volontairement `menu: []` avec le commentaire « No operational sidebar entries — admin lives under Paramètres » : décision assumée et lisible.

**Sous-structure.** Le sous-dossier `users/` possède ses propres `models/`, `services/`, `pages/`, `components/` — utile vu le volume, mais cela crée un niveau d'imbrication que les conventions ne décrivent pas (§1 ne prévoit pas de sous-domaines).

**Forces.**
- Le flux d'upload d'avatar est bien conçu : URL présignée → upload → confirmation ([user-profile.ts:448-455](src/app/features/identity/users/pages/user-profile/user-profile.ts#L448-L455), [user.service.ts:108-130](src/app/features/identity/users/services/user.service.ts#L108-L130)).
- `IdentityManagementService.getAllPrivileges()` ([lignes 52-68](src/app/features/identity/services/identity-management.service.ts#L52-L68)) pagine correctement de façon récursive — **le seul endroit du projet qui gère la pagination complète**. C'est le modèle à généraliser (M13).
- `user-create.spec.ts` (319 lignes) est le spec le plus abouti du projet, avec une vraie démarche de partitionnement d'équivalence et d'analyse aux limites.

**Faiblesses.**
- **1 test en échec** (M7) sur ce module.
- **4 composants morts** : `UserPassword`, `IdentityPlaceholder`, `UserForm`, `StatCard` (m10-m12). `UserPassword` est une page fonctionnelle complète, simplement jamais routée.
- **3 specs pour 24 fichiers** — `UsersService`, `IdentityManagementService`, `UserDetail` (576 l.), `UserProfile` (496 l.), `RoleManagement`, `ProfileManagement` sont tous non testés.
- `buildPageableParams` dupliqué 3 fois (§6.10).
- [repartition_users.ts:39-40](src/app/features/identity/dashboard/components/repartition_users.ts#L39-L40) — `signal<any>` pour les données Chart.js, et import de `chart.js` dans le bundle initial (M12). Le fichier est de plus nommé en `snake_case`, contrairement aux conventions §10.
- Tutoiement isolé dans un message d'erreur ([user-create.ts:146](src/app/features/identity/users/pages/user-create/user-create.ts#L146)).

### 7.2 Module Admission

**Périmètre.** Candidatures, portail public de préinscription, documents justificatifs, validation/rejet, réglages d'ouverture. 18 fichiers, 7 composants, 3 services (dont 1 store), 6 permissions.

**Organisation.** Le module gère deux publics avec le même service, ce qui est bien pensé : le personnel via `/admission/candidates` (protégé), et les candidats anonymes via `/apply` — déclaré **hors du shell authentifié** dans [app.routes.ts:11-16](src/app.routes.ts#L11-L16) avec `data: { publicMode: true }`, et propagé jusqu'aux appels HTTP via le `HttpContextToken PUBLIC_API_REQUEST`. La distinction public/privé est traitée avec rigueur de bout en bout.

**Forces.**
- `CandidateService` absorbe de nombreuses variations de forme de l'API (statut à la racine ou sous `candidature`, `document_type` ou `type`), ce qui rend le front résilient à un backend instable.
- `uploadDocumentWithUrlRefresh()` ([candidate.service.ts:449-477](src/app/features/admission/services/candidate.service.ts#L449-L477)) retente une fois après expiration d'une URL présignée — souci du détail appréciable.
- `candidate-format.ts` centralise tout le formatage FR et les sévérités de tags, et **il est testé** ([candidate-format.spec.ts](src/app/features/admission/utils/candidate-format.spec.ts)).
- `candidate-create.ts` est le seul gros composant qui utilise correctement `DestroyRef` + `takeUntilDestroyed`.
- Validation téléphonique internationale via `libphonenumber-js/max` avec indicatif par pays — soigné.

**Faiblesses.**
- **M2** : le pilotage de l'ouverture du portail est purement local au navigateur — sans effet réel.
- **M10** : `throw` dans un `map()` — un enregistrement malformé casse toute la liste.
- **M5** : `detailCache` non purgé à la déconnexion, et mélange des espaces de noms `<id>` / `user:<id>` / `'me'`.
- [candidate-detail.ts](src/app/features/admission/pages/candidate-detail/candidate-detail.ts) — **1 376 lignes**, le plus gros fichier du projet (§6.3).
- [candidate-portal.ts](src/app/features/admission/pages/candidate-portal/candidate-portal.ts) — 778 lignes, 13 souscriptions, **aucun spec**.
- [candidate.service.ts:468-475](src/app/features/admission/services/candidate.service.ts#L468-L475) — `catchError(() => of(null))` transforme tous les échecs en `null` : l'appelant ne peut pas distinguer « aucun document » d'« upload échoué ».
- La logique de retry sur 401/403 ([ligne 471](src/app/features/admission/services/candidate.service.ts#L471)) **fait doublon** avec le refresh de l'interceptor, ce qui peut produire deux tentatives de refresh concurrentes.
- 3 imports RxJS inutilisés dans `candidate-status-stats-widget.ts` (m4).

### 7.3 Module Académique

**Périmètre.** Facultés, programmes, niveaux, cours, unités d'enseignement, affectations, professeurs, grades, étudiants, années académiques, semestres. **53 fichiers — le module le plus volumineux**, 24 composants, 13 services, 12 modèles, 47 permissions.

**Organisation.** C'est le module le plus mûr sur le plan structurel. Il est le seul à exposer une **API publique** (`academic.public-api.ts`) pour ses consommateurs, à disposer d'un dossier `utils/` avec des helpers **testés** (`academic-http.spec.ts`, `academic-date.spec.ts`, `academic-display-name.spec.ts`), et à séparer nettement `pages/` (routes) de `settings/pages/` (référentiels). La granularité des permissions (47 clés groupées par ressource avec commentaires) est la plus fine du projet.

**La notion de périmètre faculté** — objet de la branche courante — est bien modélisée : `FacultyScopeService.scopedId()` ([faculty-scope.service.ts:20-22](src/app/core/auth/services/faculty-scope.service.ts#L20-L22)) retourne l'id à forcer sur les listes, ou `null` pour un rôle global. Les routes distinguent proprement `/academic/my-faculty` (avec `data: { ownFaculty: true }`) et `/academic/faculties/:id`, tout en réutilisant le même composant `FacultyDetailPage` ([routes.ts:19-44](src/app/features/academic/routes.ts#L19-L44)). Le concept est juste ; ce sont ses appuis techniques qui faiblissent.

**Le point le plus préoccupant du module — l'écart lecture/écriture (M15).** L'énumération `AcademicPermission` distingue systématiquement `*ReadAll` et `*UpdateAll` (47 clés). Mais cette distinction n'est honorée qu'à moitié :

| Ressource | Permission de lecture exploitée ? | Où |
|---|---|---|
| Cours | ✅ oui | [course-list.ts:79](src/app/features/academic/pages/course-list/course-list.ts#L79), [course-detail.ts:408](src/app/features/academic/pages/course-detail/course-detail.ts#L408) |
| Facultés | ✅ oui | [faculty-detail.ts:145](src/app/features/academic/pages/faculty-detail/faculty-detail.ts#L145), [faculty-scope.service.ts:14](src/app/core/auth/services/faculty-scope.service.ts#L14) |
| **Professeurs** | ❌ **non** — `ProfessorReadAll` jamais utilisé hors spec | route, menu et redirection exigent `ProfessorUpdateAll` |
| **Étudiants** | ❌ **non** — `StudentReadAll` jamais utilisé hors spec | route, menu et redirection exigent `StudentUpdateAll` |
| Programmes, unités d'ens. | ❌ non — `ProgramReadAll`, `CourseUnitReadAll` jamais utilisés | |

Un rôle de consultation (secrétariat, direction, audit) porteur de `academic:professor:read:all` est donc **totalement aveugle** sur le module : pas d'entrée de menu, pas d'accès aux routes, et `/academic` le redirige vers `/access-denied`. Les deux specs en échec (`academic-home-redirect.spec.ts:38,46`) encodent explicitement le comportement inverse — c'est donc une intention de conception qui n'a pas été implémentée jusqu'au bout, et non un simple test obsolète.

**Forces.**
- 14 specs — la meilleure couverture absolue des trois modules (`professor.service.spec.ts`, `student.service.spec.ts`, `academic-http.spec.ts`, `academic-date.spec.ts`…).
- `AcademicCatalogService` mémoïse les référentiels partagés et offre des invalidations ciblées.
- `ProfessorService`/`StudentService` utilisent `http.get<unknown>` + normalisation explicite — plus robuste que le typage direct utilisé ailleurs.
- `toPaged()` et `asList()` ([utils/](src/app/features/academic/utils/)) isolent les incohérences de forme de l'API en un point unique et testé.
- `student-detail.ts` est le seul composant de détail à utiliser `takeUntilDestroyed` sur ses `valueChanges`.

**Faiblesses.**
- **M15** : rôles en lecture seule exclus du module (voir ci-dessus) — **2 specs en échec**.
- **4 des 9 fuites de souscription** (M6) sont ici : `faculty-detail.ts:204`, `professor-detail.ts:310`, `student-detail.ts:276`, `course-detail.ts:216`.
- **M14** : `CourseService.findById()` charge tout le catalogue ; `getAll()` n'a même pas de paramètres de pagination ([course.service.ts:12-14](src/app/features/academic/services/course.service.ts#L12-L14)).
- **M13** : 5 des 10 plafonnements `size=100` sont ici.
- `resolveAttachedFaculty()` en N+1 requêtes (§6.9).
- **M12** : `FacultyScopeService` est logé dans `core/auth/` alors qu'il dépend d'`AcademicPermission`.
- Composants volumineux : `professor-detail.ts` (655 l.), `faculty-detail.ts` (622 l.), `course-detail.ts` (543 l.) — aucun n'a de spec sauf `professor-detail`.
- Nombreux `subscribe` sans handler `error` (`course-detail.ts` : 5 occurrences, `course-list.ts` : 2).
- **m20** : `key: 'Academique'`, libellés FR/EN mélangés.
- `AcademicPlaceholder` mort (m11) ; `StudentReadOwn` marqué « placeholder — module étudiant pas encore branché » ([permission.model.ts:59](src/app/features/academic/permissions/permission.model.ts#L59)).
- 11 des 13 services sans spec.

---

## 8. Plan d'action priorisé

### 8.1 À corriger immédiatement

| # | Action | Réf. | Effort |
|---|---|---|---|
| 1 | **Réparer l'artefact de production** : `apiBaseUrl: ''` + `location /api { proxy_pass ... }` dans `nginx.conf`. Sans cela l'image Docker publiée ne peut pas joindre l'API. | C1 | **Faible** |
| 2 | **Rendre le pipeline bloquant** : job `quality` (`npm ci && npm run lint && npm run test:ci && npm run build:prod`) en `needs` du job de build. | C2 | **Faible** |
| 3 | **Débloquer la suite de tests** : neutraliser `AppFloatingConfigurator` dans `error.spec.ts` (spec fautif confirmé) et ajouter un `karma.conf.js` avec des timeouts relevés. Prérequis à toute mesure de couverture. | M8 | **Moyen** |
| 4 | **Rétablir la réactivité des permissions** : `PermissionService.getCurrentPermissions()` doit lire `authService.currentUser()` et non `getCurrentUser()`. Une ligne, effet sur toute l'application. | M1 | **Faible** |
| 5 | **Trancher la question lecture/écriture du module Académique** : accepter `ProfessorReadAll`/`StudentReadAll` sur les routes, le menu et la redirection (mode `any`), ou retirer ces permissions et corriger les specs. Décision fonctionnelle à prendre avant tout correctif. | M15 | **Moyen** |
| 6 | **Corriger le test en échec** de `user-create` (message de conflit e-mail). | M7 | **Faible** |
| 7 | **Corriger les 6 erreurs de lint** (prérequis à l'action 2). | §2 | **Faible** |
| 8 | **Restreindre l'interceptor** à l'origine de l'API et marquer `PUBLIC_API_REQUEST` sur les `PUT` vers les URLs présignées. | M4 | **Faible** |
| 9 | **Supprimer `SMARTCAMPUS_API_PASSWORD`** de `environment.development.ts` et faire tourner le secret. | m7 | **Faible** |
| 10 | **Purger les caches à la déconnexion** (`CandidateService`, `AcademicCatalogService`) depuis `clearSession()`. | M5 | **Faible** |
| 11 | **Ne plus faire échouer une liste entière** sur un enregistrement invalide (`throw` → filtrage dans `normalizeListItem`). | M10 | **Faible** |

### 8.2 À court terme (1 à 2 sprints)

| # | Action | Réf. | Effort |
|---|---|---|---|
| 12 | Ajouter `takeUntilDestroyed` aux **9 souscriptions non libérées** et inscrire la règle dans les conventions §3. | M6 | **Moyen** |
| 13 | Ajouter les **en-têtes de sécurité** (CSP, HSTS, X-Frame-Options, X-Content-Type-Options) dans `nginx.conf` ; héberger la police localement. | M3 | **Faible** |
| 14 | Implémenter `returnUrl` sur `authGuard` + `Login`, et traiter l'absence d'`expires_at` comme « expiré ». | M11 | **Faible** |
| 15 | Corriger la redirection `/settings` (fonction de redirection sur le premier onglet visible) et supprimer le bloc mort du shell. | M9 | **Faible** |
| 16 | Créer `core/http/error.interceptor.ts` + `loading.interceptor.ts` et remplacer les ~40 duplications de `error.error?.detail ?? ...`. | §6.6 | **Moyen** |
| 17 | **Supprimer le code mort** : `UserPassword`, `IdentityPlaceholder`, `AcademicPlaceholder`, `UserForm`, `StatCard`, `FirstCharPipe`, notifications factices de la topbar, `staticMenuMobileActive`, `login.json`. | m10-m16 | **Faible** |
| 18 | Remplacer les **3 `subscribe` imbriqués** par `switchMap`/`forkJoin` et exposer un vrai `GET /courses/{id}`. | M14 | **Moyen** |
| 19 | Généraliser la **pagination complète** (pattern `getAllPrivileges()`) sur les 10 plafonnements `size=100`. | M13 | **Moyen** |
| 20 | **Tester les services à logique pure** : `CandidateService` (normalisation + cache), `AcademicCatalogService`, `FacultyScopeService`, `DetailNavigationService`. Meilleur rapport valeur/effort pour remonter la couverture. | §6.10 | **Moyen** |
| 21 | Déduplication : un seul `PagedResponse<T>` et un seul `buildPageableParams` dans `shared/`. | §6.10 | **Faible** |
| 22 | Réactiver progressivement les **règles de lint a11y** (`alt-text`, `label-has-associated-control` en premier) et ajouter les gestionnaires clavier d'`app.menuitem.ts`. | §6.11 | **Moyen** |
| 23 | Sortir les **70 Mo de binaires** de `.tools/` du dépôt (téléchargement à la demande via script). | §6.10 | **Faible** |

### 8.3 À moyen terme (trimestre)

| # | Action | Réf. | Effort |
|---|---|---|---|
| 24 | **Porter les réglages Admission et CORE côté serveur** (`GET/PUT /api/v1/admission/settings`) et faire appliquer la fenêtre d'inscription par le backend. Condition pour que le portail public soit réellement pilotable. | M2 | **Élevé** |
| 25 | **Revoir le stockage des tokens** : refresh token en cookie `HttpOnly; Secure; SameSite`, access token en mémoire. Nécessite une coordination backend. | M3 | **Élevé** |
| 26 | **Découper `candidate-detail.ts`** (1 376 l.) : extraire `detailSections` en fonction pure, le rafraîchissement d'URLs présignées en service, la prévisualisation en composant. Idem pour `candidate-portal.ts` et `professor-detail.ts`. | §6.3 | **Élevé** |
| 27 | **Rendre les widgets du dashboard paresseux** (`component: () => Promise<Type>`) et passer les pages en `loadComponent` pour sortir `chart.js` du bundle initial. | M12 | **Moyen** |
| 28 | **Corriger l'inversion de dépendance** : déplacer `FacultyScopeService` vers `features/academic/`, créer `identity.public-api.ts`, interdire les imports profonds inter-features via `eslint-plugin-import`. | M12 | **Moyen** |
| 29 | **Migrer vers `httpResource()` / `rxResource()`** (Angular 21) sur les pages de détail : supprime structurellement les fuites, l'annulation manuelle et la gestion d'état de chargement. | §6.5 | **Élevé** |
| 30 | **Mettre en place l'i18n** (`@angular/localize`) — le coût croît à chaque module ajouté. | §6.11 | **Élevé** |
| 31 | **Introduire des tests e2e** (Playwright) sur les parcours critiques : connexion, soumission d'une candidature publique, validation par le personnel, périmètre faculté. Répond à l'exigence « Generate e2e tests » d'`AGENTS.md`. | §2 | **Élevé** |
| 32 | **Généraliser `OnPush`** en commençant par les listes et widgets, puis activer la règle de lint correspondante. | §6.3 | **Moyen** |
| 33 | **Introduire des resolvers** (ou `httpResource`) sur les pages de détail pour supprimer le flash de page vide. | §6.2 | **Moyen** |
| 34 | **Mettre à jour `conventions_architecturales.md`** : corriger `sessionStorage` → `localStorage` (§7), documenter l'obligation de `takeUntilDestroyed` (§3), décrire le pattern de sous-domaine (`users/`) et la règle des API publiques inter-features. | §6.10 | **Faible** |

---

## Annexe — Commandes exécutées

```bash
npm run build:prod                                          # exit 0 — 0 erreur, 0 avertissement
npm run lint                                                # 6 problems (6 errors, 0 warnings)
npx ng test --watch=false --browsers=ChromeHeadless         # 160/214, 3 FAILED, DISCONNECTED
npm run test:ci                                             # Coverage: Unknown% (0/0)

# Bissection du crash et des échecs
npx ng test --include='src/app/core/auth/error.spec.ts'       # 💥 ERROR — navigateur déconnecté
npx ng test --include='src/app/core/auth/login.spec.ts'       # 19 SUCCESS
npx ng test --include='src/app/core/auth/guards/*.spec.ts'    # 4 SUCCESS
npx ng test --include='src/app/core/auth/interceptors/*.spec.ts' # 16 SUCCESS
npx ng test --include='src/app/core/auth/services/*.spec.ts'  # 17 SUCCESS
npx ng test --include='src/app/layout/**/*.spec.ts'           # 9 SUCCESS
npx ng test --include='src/app/shared/**/*.spec.ts'           # 3 SUCCESS
npx ng test --include='src/environments/**/*.spec.ts'         # 1 SUCCESS
npx ng test --include='src/app/features/identity/**/*.spec.ts'  # 1 FAILED, 34 SUCCESS
npx ng test --include='src/app/features/admission/**/*.spec.ts' # 16 SUCCESS
npx ng test --include='src/app/features/academic/**/*.spec.ts'  # 2 FAILED, 53 SUCCESS
npx ng test --include='**/user-create.spec.ts'                # 1 FAILED, 24 SUCCESS
```

### Annexe — Les 3 specs en échec

| Spec | Attendu | Obtenu |
|---|---|---|
| [user-create.spec.ts:214](src/app/features/identity/users/pages/user-create/user-create.spec.ts#L214) | message contenant `déjà utilisée` / `/e-mail est déjà associée/` | `'Un utilisateur avec ces informations existe déjà.'` |
| [academic-home-redirect.spec.ts:38](src/app/features/academic/pages/academic-home-redirect/academic-home-redirect.spec.ts#L38) | `['/academic/professors']` | `['/access-denied']` |
| [academic-home-redirect.spec.ts:46](src/app/features/academic/pages/academic-home-redirect/academic-home-redirect.spec.ts#L46) | `['/academic/students']` | `['/access-denied']` |

*Rapport généré le 28/09/2026 — branche `feature/admission-faculty-filter`, HEAD `7db320c`. Aucun fichier source modifié.*
