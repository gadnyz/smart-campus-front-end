# Communication avec le backend

Ce guide explique comment le front-end appelle l'API : construction des URL, authentification, écriture d'un service, gestion des erreurs, pagination et fichiers. Il s'adresse aux développeurs qui ajoutent ou modifient un appel à l'API. Le fonctionnement interne du backend n'est pas décrit ici.

## URL de base et proxy

Toutes les URL de l'API suivent le même modèle :

```ts
`${environment.apiBaseUrl}/api/v1/<ressource>`
```

| Contexte | `apiBaseUrl` | Résultat |
|---|---|---|
| Développement (`npm start`) | `''` | URL relative `/api/v1/...`, relayée par `proxy.conf.json` vers `http://localhost:8085` |
| Production (`npm run build:prod`) | `'http://localhost:8085'` | URL absolue, appelée directement par le navigateur |

La configuration détaillée est dans [Installation](../installation.md#configuration).

Le client HTTP est configuré une seule fois, dans `src/app.config.ts` :

```ts
// src/app.config.ts (ligne 51)
provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
```

Le seul intercepteur est `authInterceptor`.

## Authentification

### Ouvrir une session

1. La page de connexion appelle `AuthService.login()`, qui envoie `POST /api/v1/auth/login`.
2. L'API renvoie un `AuthResponse` : jeton d'accès, jeton de rafraîchissement, durée de validité et utilisateur, avec ses `authorities`.
3. `AuthService.storeSession()` enregistre la session dans `localStorage`.

| Clé `localStorage` | Contenu |
|---|---|
| `access_token` | Jeton d'accès |
| `refresh_token` | Jeton de rafraîchissement |
| `current_user` | Utilisateur connecté, en JSON |
| `expires_at` | Date d'expiration du jeton d'accès, en millisecondes |

L'utilisateur connecté est aussi exposé par le signal `AuthService.currentUser`.

### Envoyer le jeton

`authInterceptor` (`core/auth/interceptors/auth.interceptor.ts`) ajoute l'en-tête `Authorization: Bearer <jeton>` à toute requête vers `/api/`, sauf dans deux cas :

- les routes d'authentification publiques : connexion, déconnexion, rafraîchissement, mot de passe oublié et réinitialisation ;
- les requêtes marquées comme publiques avec le jeton de contexte `PUBLIC_API_REQUEST`.

Le formulaire public de candidature (`/apply`) utilise ce marquage :

```ts
// src/app/features/admission/services/candidate.service.ts (lignes 276 à 280)
private httpContext(publicRequest?: boolean): HttpContext {
    return publicRequest
        ? new HttpContext().set(PUBLIC_API_REQUEST, true)
        : new HttpContext();
}
```

### Expiration et rafraîchissement

Quand l'API répond 401 à une requête authentifiée, l'intercepteur :

1. rafraîchit la session avec `POST /api/v1/auth/refresh-token` ;
2. rejoue la requête avec le nouveau jeton.

Si plusieurs requêtes reçoivent un 401 en même temps, un seul rafraîchissement est envoyé et toutes l'attendent. Si le rafraîchissement échoue, ou si aucun jeton de rafraîchissement n'existe, la session est effacée et l'utilisateur est renvoyé vers `/auth/login`.

Au démarrage de l'application, `AuthService.restoreSession()` est exécuté (`provideAppInitializer` dans `src/app.config.ts`). Si le jeton d'accès a expiré, ou expire dans les 30 secondes, la session est rafraîchie avant le premier affichage. Si l'API refuse le rafraîchissement (401 ou 403), la session est effacée.

### Fermer une session

La déconnexion, déclenchée depuis la barre supérieure (`layout/component/app.topbar.ts`), envoie `POST /api/v1/auth/logout` avec les deux jetons. La session locale est effacée ensuite, que l'appel réussisse ou non.

La session est partagée entre les onglets du navigateur : une connexion ou une déconnexion dans un onglet s'applique aux autres, grâce à l'événement `storage`.

### Guards

| Guard | Fichier | Effet |
|---|---|---|
| `authGuard` | `core/auth/guards/auth.guard.ts` | Sans session, redirige vers `/auth/login`. Protège tout le shell applicatif. |
| `guestGuard` | `core/auth/guards/guest.guard.ts` | Avec une session, redirige vers `/`. Protège la connexion et la réinitialisation du mot de passe. |
| `permissionGuard` | `core/permissions/permission.guard.ts` | Sans les autorités requises, redirige vers `/access-denied`. Voir [Brancher un module](brancher-un-module.md#gerer-les-droits). |

## Écrire un service API

Le tutoriel [Créer un module](creer-un-module.md#etape-3-ecrire-le-service-api) détaille un service complet, `RoomService`. Les services existants appliquent les règles suivantes :

- Déclarez le service avec `@Injectable({ providedIn: 'root' })`.
- Injectez `HttpClient` avec `inject()`.
- Construisez l'URL à partir de `environment.apiBaseUrl`.
- Renvoyez des `Observable` typés ; le composant s'abonne.
- Ne gérez pas le jeton : l'intercepteur s'en charge.

## Typer les requêtes et les réponses

- Reprenez exactement les noms de champs de l'API, en snake_case : `created_at`, `program_level_id`.
- Séparez le type reçu du type envoyé, par exemple `Room` et `RoomRequest` dans `features/scheduling/models/room.model.ts`.
- Pour une réponse paginée, utilisez `PagedResponse<T>` de `shared/models/paged-response.model.ts` :

    ```ts
    // src/app/shared/models/paged-response.model.ts (lignes 8 à 14)
    export interface PagedResponse<T> {
        content: T[];
        page: number;
        size: number;
        total_elements: number;
        total_pages: number;
    }
    ```

- Si l'API renvoie une forme difficile à afficher, convertissez-la dans le service. `CandidateService` le fait avec ses méthodes `normalizeCandidate` et `normalizeListItem`.

## Gérer les erreurs

L'application applique quatre règles d'affichage.

| Règle | Mise en œuvre |
|---|---|
| Une erreur de saisie s'affiche sous le champ concerné. | Validators Angular et message conditionnel sous le champ (voir `rooms.html`, lignes 117 à 123). |
| Une erreur de l'API s'affiche dans un toast. | `MessageService` de PrimeNG, avec un message lisible. |
| Aucun identifiant technique n'est affiché. | `readableApiText` retire les UUID d'un message. |
| Les dates sont en français. | `readableApiText` convertit les dates ISO, par exemple en « 23 novembre 2026 ». |

### Message d'une erreur de l'API

L'API renvoie ses erreurs au format ProblemDetail, avec un champ `detail` déjà en français. `apiErrorMessage` choisit le message à afficher :

```ts
// src/app/shared/http/api-error.ts (lignes 21 à 31)
export function apiErrorMessage(error: unknown, fallback: string): string {
    const detail = problem(error)?.['detail'];
    if (typeof detail === 'string' && detail.trim()) {
        // Jamais d'identifiant technique ni de date ISO à l'écran.
        return readableApiText(detail) || fallback;
    }
    if (error instanceof HttpErrorResponse && error.status === 0) {
        return UNREACHABLE_MESSAGE;
    }
    return fallback;
}
```

| Situation | Message affiché |
|---|---|
| L'API renvoie un `detail` | Le `detail`, rendu lisible |
| L'API n'a pas répondu (statut 0) | « Le serveur est injoignable. Vérifiez votre connexion puis réessayez. » |
| Autre cas | Le message de repli passé par l'écran |

Utilisation dans une page :

```ts
// src/app/features/scheduling/settings/pages/rooms/rooms.ts (ligne 240)
this.showError(apiErrorMessage(error, 'Impossible de charger les salles.'));
```

Quand un écran connaît le nom correspondant à un identifiant, passez une table de libellés à `readableApiText(texte, libellés)` : l'identifiant est alors remplacé par ce nom au lieu d'être retiré.

### Erreurs de validation renvoyées par l'API

Une erreur 400 peut contenir un champ `invalid_fields`, qui associe chaque champ à son message. `apiInvalidFields` (`shared/http/api-error.ts`) extrait cet objet, pour afficher chaque message sous le champ concerné.

!!! note
    `apiInvalidFields` n'est encore utilisé par aucun écran.

## États de chargement

Chaque page déclare des signals d'état, lus par le template :

- `loading` pendant le chargement d'une liste, passé à `[loading]` de `p-table` ;
- `saving` pendant un enregistrement, pour désactiver le bouton et afficher son indicateur.

Remettez toujours ces signals à `false`, aussi dans la branche `error` de l'abonnement (voir `rooms.ts`, lignes 229 à 243).

## Pagination, filtres et recherche

### Paramètres de requête

Construisez les paramètres avec `toApiParams` (`shared/http/api-params.ts`). La fonction :

- refuse une clé qui n'est pas en snake_case, car l'API ignorerait ce paramètre sans erreur ;
- omet les valeurs vides, `null` et `undefined` ;
- répète la clé pour un tableau : `sort=a&sort=b`.

```ts
// src/app/features/academic/services/course.service.ts (lignes 18 à 28)
list(query: CourseQuery = {}): Observable<PagedResponse<Course>> {
    return this.http.get<PagedResponse<Course>>(this.baseUrl, {
        params: toApiParams({
            faculty_id: query.facultyId,
            search: query.search,
            page: query.page ?? 0,
            size: query.size ?? 20,
            sort: query.sort ?? []
        })
    });
}
```

### Trois cas de pagination

| Cas | Exemple | Méthode |
|---|---|---|
| L'API renvoie un tableau simple | `GET /api/v1/rooms` | Filtrage et pagination dans le navigateur. Voir `filteredRooms` dans `rooms.ts`. |
| La liste est longue et l'API est paginée | Horaires en attente | Tableau `p-table` en mode `[lazy]="true"` : chaque changement de page appelle l'API (`onLazyLoad`) et `totalRecords` vient de `total_elements`. Voir `features/scheduling/timetable/pages/timetable-pending/`. |
| Il faut toute la liste, par exemple pour une liste de choix | Tous les cours | Parcours des pages successives avec l'opérateur `expand`. Voir la méthode privée `pages` de `features/academic/services/course.service.ts`. |

Le commentaire de `course.service.ts` indique que l'API renvoie au plus 100 cours par page.

## Fichiers

### Envoyer un document

Les documents des candidats sont envoyés en trois étapes (`features/admission/services/candidate.service.ts`) :

1. `requestDocumentUploadUrl()` demande à l'API une URL d'envoi : `POST /api/v1/candidates/{id}/documents/upload-url`, avec le type de document et l'extension en paramètres.
2. `uploadDocument()` envoie le fichier directement à cette URL, par une requête `PUT`. Cette URL ne commence pas par `/api/` : l'intercepteur n'y ajoute pas de jeton.
3. `confirmDocumentUpload()` confirme l'envoi : `POST /api/v1/candidates/{id}/documents/confirm`.

### Télécharger un document

`getDocumentDownloadUrl()` demande une URL de téléchargement signée et temporaire : `GET /api/v1/candidates/{id}/documents/{documentId}/download-url`. `isSignedUrlExpiredOrExpiring` (`shared/utils/signed-url.ts`) indique si une URL signée a expiré ou expire dans la minute.

### Exporter en PDF et en Excel

Les exports des horaires sont produits dans le navigateur, sans appel à l'API (`features/scheduling/timetable/services/timetable-export.service.ts`) :

| Méthode | Effet |
|---|---|
| `print()` | Ouvre le PDF dans un nouvel onglet, avec la boîte d'impression |
| `downloadPdf()` | Télécharge le PDF |
| `downloadExcel()` | Télécharge le classeur Excel |

pdfmake et ExcelJS ne sont chargés qu'au premier export.

## Développer sans backend

Le dépôt ne fournit ni serveur simulé, ni données locales de remplacement : l'application a besoin de l'API pour afficher des données. Seuls les tests unitaires fonctionnent sans backend. Ils remplacent les appels par `HttpTestingController` ou par des services espionnés (voir [Créer un module](creer-un-module.md#etape-7-ecrire-les-tests)).
