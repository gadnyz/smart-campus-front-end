# Smart-campus — Écart front-end ↔ back-end, et recommandations (05/11/2026)

**Méthode**
- **Front** : lecture des fichiers d'Angular (`src/app`) sur la branche `feature/Scheduling`, avec les modifications locales.
- **Back** : consulté uniquement par l'API (`http://localhost:8085`), avec le compte admin :
  - le contrat OpenAPI en direct (`/v3/api-docs`, **132 opérations**, 98 schémas) ;
  - des sondages `GET` en lecture seule, sans aucune écriture : on rejoue chaque appel tel que le front le fait, puis tel que la documentation le prévoit.
- **Écrans** : 22 routes parcourues avec le compte admin, sur ordinateur (1366 px) et mobile (390 px), avec relevé des appels en échec, des erreurs JavaScript et du débordement horizontal.

**Limite** : la base de dev est presque vide (0 horaire, 0 cours, 1 niveau, 3 professeurs, 2 candidatures). Certains sondages n'ont donc pas pu montrer de différence. Ces constats sont fondés sur le contrat OpenAPI et le code du front, et sont marqués « contrat ».

Légende : 🔴 P0 (cassé, données fausses) · 🟠 P1 (incomplet, risque) · 🟡 P2 (amélioration) · ✅ corrigé depuis le 21/10

---

## 1. Synthèse

| Indicateur | Valeur |
|---|---|
| Opérations de l'API | 132 |
| Utilisées par le front | 112 |
| Non utilisées | 20 (dont 6 sans intérêt pour l'interface actuelle) |
| Appels du front vers des routes **inexistantes** | 4 (réponse 404 confirmée en direct) |
| Paramètres de requête **ignorés** par le backend (mal nommés) | 13 |
| Écarts de contrat (forme des requêtes ou réponses) | 7 |
| Écrans cassés au chargement | 1 (liste des cours : `courses is not iterable`) |
| Défauts côté API à remonter au backend | 9 |

**Corrigé depuis le 21/10** ✅
- Profil personnel via `/users/me`.
- Faculté de l'utilisateur (`faculty_id`).
- Dossier candidat via `/candidates/me`, et ses documents via `/candidates/me/documents/…`.
- Suppression de l'appel `DELETE /users/me/avatar`, qui n'existe pas.
- Fiche candidat (admin) alignée sur « Mon dossier ».
- Portées lisibles dans l'écran Rôles.

**Toujours ouvert** : les paramètres de requête en camelCase (Scheduling, Academic, Admission), le contrat des unités d'enseignement, la liste des cours, les routes inexistantes pour les professeurs et les étudiants, et l'absence de prise en compte des nouvelles portées (`faculty`, `promotion`) dans les menus et les routes d'Academic, Admission et Scheduling.

---

## 2. Écarts fonctionnels, par module et par ressource

### 2.1 Scheduling

| Prio | Ressource | Fenêtre(s) | Écart | Preuve |
|---|---|---|---|---|
| 🔴 | Timetables | Calendrier, Horaires en attente, Formulaire d'horaire (reprise après un 409) | `GET /timetables` reçoit `academicYearId`, `facultyId`, `programId` et `programLevelId`. Le contrat attend `academic_year_id`, `faculty_id`, `program_id` et `program_level_id` : **les filtres sont ignorés**. Le calendrier et la liste « en attente » reçoivent les horaires de toutes les promotions et facultés. Après un 409, le formulaire peut rouvrir l'horaire d'une autre promotion. | `services/timetable.service.ts:53-56` ; contrat |
| 🔴 | Timetable Entries | Calendrier | `GET /timetable-entries/timetable/{id}/week?referenceDate=` : le paramètre attendu est `reference_date`. Le backend renvoie la semaine **courante** au lieu de celle de l'horaire. | `services/timetable-entry.service.ts:36` ; contrat |
| 🔴 | Timetables | Mon horaire (étudiant) | Même erreur sur `/timetables/me/week` : l'étudiant ne peut pas changer de semaine. | `services/timetable.service.ts:30` |
| 🟠 | Timetables | Calendrier | Le filtre `week` est contourné parce que le backend répond **500**. C'est confirmé en direct le 05/11 (`GET /timetables?week=2026-10-19` → 500 ProblemDetail). | sondage |
| 🟠 | Timetable Entries | Fenêtre de session | `warnings[]` (`PROFESSOR_DOUBLE_BOOKED`) est renvoyé par l'API mais ni lu ni affiché. | `models/timetable-entry.model.ts` (aucun champ `warnings`) |
| 🟠 | Timetable Entries | Fenêtre de session, calendrier | Sessions partagées (tronc commun) non gérées : `shared_with_program_level_ids` en entrée, `host_program_level_id` et `audience_program_level_ids` en sortie. | idem |
| 🟡 | Timetables | Formulaire, liste | La **duplication de semaine** (`POST /timetables/{id}/duplicate`, avec rejet 422 par position) n'est pas exploitée. | inventaire |
| 🟡 | Timetable Entries | — | L'occupation d'une salle (`/timetable-entries/room/{id}`) et la plage de dates (`/timetable/{id}/range`) ne sont pas exploitées. La vue mois charge une semaine à la fois. | inventaire |
| 🟡 | Timetable Entries | Formulaire | Aucun découpage des lots au-delà de 200 séances, alors que le contrat plafonne à `maxItems: 200`. | `timetable-form.ts` |

### 2.2 Academic

| Prio | Ressource | Fenêtre(s) | Écart | Preuve |
|---|---|---|---|---|
| 🔴 | Courses | **Cours** (liste), Mes cours, Fiche professeur, Fiche cours | `GET /courses` renvoie un `PagedResponse`, mais le front attend un tableau. La liste **reste bloquée en chargement**, avec l'erreur JS `courses is not iterable` (ordinateur et mobile). Ni `faculty_id`, ni `search`, ni pagination côté serveur. | `services/course.service.ts:13` ; capture `/academic/courses` ; sondage `200 paged` |
| 🔴 | Course Units | Unités d'enseignement (création, détail) | La création envoie `program_level_id` (une seule valeur), alors que le contrat **exige** `program_level_ids[]`, d'où un 400. Le détail lit `program_level_id` et `knowledge_skills_bloc` à la racine, alors que la réponse porte `curriculum[]`. La modification envoie un bloc et un niveau que `UpdateCourseUnitRequest` (champ `code` seul) ignore sans rien signaler. | `models/course-unit.model.ts` ; `course-unit-list.ts:229-239` ; schémas |
| 🔴 | Professors | Professeurs (SAF), Fiche professeur, Fiche cours | Appels à `/professors/faculty/{id}` et `/professors/grade/{id}` : **404 en direct**. La bonne route est `GET /professors?faculty_id=&professor_grade_id=&search=`, dont l'existence est confirmée. | `services/professor.service.ts:26-34` ; sondage |
| 🔴 | Students | Étudiants (liste) | Paramètres hors contrat : `gender`, `level_id`, `nationality`, `matricule` et `q`. `q` est **ignoré en direct** (`q=zzzz` → 1 résultat, `search=zzzz` → 0). Le contrat attend `program_level_id`, `academic_year_id` et `search`. Le filtrage côté client fausse le total, et le filtre de niveau compare `level_id` alors que la liste renvoie `program_level_id`. | `services/student.service.ts:24-45` ; `models/student.model.ts:189-228` ; sondage |
| 🔴 | Students | Fiche cours (« Étudiants inscrits ») | Appels à `/students/course/{id}` puis `/courses/{id}/students` : **404**. Le panneau reste toujours vide. | `services/student.service.ts` (`getByCourse`) ; sondage |
| 🟠 | Course Units | Fiche UE | Tronc commun et bloc par promotion (`/course-units/{id}/program-levels/{plId}`) absents, ainsi que les cours d'une UE avec crédits propres (`/course-units/{id}/courses`). | inventaire |
| 🟠 | Course Units | Unités d'enseignement | Filtre `knowledgeSkillsBloc` au lieu de `knowledge_skills_bloc`. | `services/course-unit.service.ts:21` |
| 🟠 | Courses | Formulaire cours | `course_unit_id` est obligatoire côté front, alors que le contrat accepte `course_unit_id` **ou** `faculty_id`. | `models/course.model.ts` |
| 🟠 | Professors | Professeurs, `ProfessorLabelService` | `size=100` figé : au-delà de 100 enseignants, la liste et les libellés « grade + nom » sont tronqués. | `services/professor.service.ts:13` |
| 🟠 | Programs | Fiche faculté › programme | La modification se fait en **deux PUT** successifs (contournement d'un bug Hibernate), sans retour arrière si le second échoue. | `services/program.service.ts:22-33` |
| 🟡 | Course Assignments | Mes cours | `/course-assignments/me` n'est pas utilisé : la page reconstitue les cours à partir de la liste complète, elle-même cassée. | `pages/my-courses/my-courses.ts` |
| 🟡 | Students | — | Pas d'écran « Mon dossier étudiant » (`/students/me`). | inventaire |
| 🟡 | Faculty Leadership | Fiche faculté, Ma faculté | `resolveAttachedFaculty` interroge la direction de toutes les facultés (N+1 appels) alors que `faculty_id` est dans le contexte de connexion. | `services/faculty.service.ts` |
| 🟡 | Catalogue | — | `page` et `size` sont envoyés à des routes non paginées (facultés, niveaux, programmes, années). Sans effet, mais trompeur. | `academic-catalog.service.ts:136` |

### 2.3 Admission

| Prio | Ressource | Fenêtre(s) | Écart | Preuve |
|---|---|---|---|---|
| 🔴 | Candidates | Candidatures (liste), widget du tableau de bord | Le filtre `facultyId` est envoyé au lieu de `faculty_id` : il est ignoré (contrat ; non démontrable en direct, la base ne contenant qu'une faculté avec des candidats). | `services/candidate.service.ts:80` |
| 🟠 | Candidates | Fiche candidat (admin) | `PUT /candidates/{id}` (correction d'un dossier par le personnel) n'est pas exploité. | inventaire |
| 🟠 | Candidates | Mon dossier, création | Les échecs d'envoi de documents sont avalés (`catchError → of(null)`) : on peut perdre une pièce sans le savoir. | `candidate.service.ts` (`uploadDocuments`) |
| 🟡 | Candidates | Candidatures (liste) | La liste n'a pas de pagination visible, contrairement aux autres listes (capture). | capture `/admission/candidates` |
| ✅ | Candidates | Mon dossier, Fiche candidat | Routes `/me`, documents du candidat, présentation commune avec la fiche admin. | — |

### 2.4 Identity

| Prio | Ressource | Fenêtre(s) | Écart | Preuve |
|---|---|---|---|---|
| 🟠 | Privileges | Paramètres › Identité | Seule la liste est utilisée : création, consultation et suppression (`POST`, `GET {id}`, `DELETE`) sont absentes. La redirection `/identity/privileges` mène vers une route admin **inexistante**, donc vers `/notfound` (constaté pendant le tour). | `identity/routes.ts:24` ; capture |
| 🟠 | Users | Fiche utilisateur › Autorisations | Les privilèges issus d'un mandat (SAF, doyen) n'apparaissent pas, car l'API ne les renvoie qu'à la connexion. L'origine des privilèges (profil ou accord direct) n'est pas distinguée, et le bouton ✕ (retirer) est proposé sur des privilèges qu'il ne peut pas retirer. | `user-detail.html` ; constaté le 21/10 |
| 🟡 | Dashboard | Widget « Répartition des utilisateurs » | Il charge 100 utilisateurs pour compter : le résultat est faux au-delà de 100. | `dashboard/components/repartition_users.ts:67` |
| ✅ | Users | Mon profil, Fiche utilisateur | `/users/me`, faculté, lecture seule par `read:all`, portées lisibles dans Rôles. | — |

### 2.5 Transverse : droits d'accès et nouvelles portées

| Prio | Constat | Preuve |
|---|---|---|
| 🔴 | Les **routes et menus** d'Academic, Admission et Scheduling n'acceptent que des clés exactes, le plus souvent `update:all`, même pour **consulter** : par exemple `students` exige `academic:student:update:all`, et `candidates` exige `admission:candidate:update:all`. Les 23 privilèges `:faculty` et `:promotion` que déclare l'API ne donnent accès à **aucun** écran. Un SAF (`student:read:faculty`, `course:read:faculty`…) ou un profil ACADEMIC_SECRETARY (`timetable:create:faculty`…) ne voit donc ni ses menus ni ses pages, alors que le backend restreint déjà les données à sa faculté. | `academic/routes.ts`, `admission/routes.ts`, `scheduling/timetable/routes.ts` ; `MANAGE_TIMETABLES = [TimetableCreateAll, TimetableUpdateAll]` |
| 🟠 | Le socle existe (`PermissionService.scopeOf` / `hasScope`) mais il n'est encore branché que dans Identity. | `core/permissions/permission-scope.ts` |

---

## 3. Défauts côté API (à remonter au backend)

| # | Défaut | Constat |
|---|---|---|
| B1 | `GET /timetables?week=…` → **500** | Sondage du 05/11 |
| B2 | Le contenu des listes paginées n'est pas typé (`PagedResponse.content: items {}`). Par exemple `/students` renvoie des champs (`faculty_name`, `program_level_id`, `level_name`…) que `StudentResponse` ne documente pas, et il lui en manque d'autres (état civil, origine). | Comparaison du sondage et du schéma |
| B3 | Les erreurs 4xx sont typées avec le schéma de **succès**, au lieu de `ProblemDetail` (sauf pour `/auth`). Le format des erreurs par lot (`errors[].index`) n'est pas documenté (422 sur les séances et sur la duplication). | Contrat |
| B4 | `POST /professors` et `DELETE /professors/{id}` renvoient 200 au lieu de 201 et 204. | Contrat |
| B5 | `Pageable` est exposé comme un objet de requête (`pageable`) sur users, roles, profiles et privileges, au lieu de `page`, `size` et `sort`. | Contrat |
| B6 | `SemesterResponse` et `AcademicYearResponse` sont en `date-time`, alors que les requêtes sont en `date`. | Contrat |
| B7 | Il n'existe ni `GET` ni `DELETE` sur `/courses/{id}`, ni `PUT` sur `/timetables/{id}`. | Contrat |
| B8 | La documentation OpenAPI est protégée par une **authentification HTTP Basic** alors que l'API utilise un jeton (*bearer*) : le jeton de l'application ne permet pas de la lire. À documenter pour l'équipe, ou à aligner. | Sondage : bearer → 401, basic → 200 |
| B9 | `/users/me` ne renvoie pas les privilèges des mandats, et le mot de passe généré d'un nouveau compte est écrit en clair dans les journaux du backend (constaté le 21/10). | Rappel |

---

## 4. Interface (UI/UX) : à harmoniser

| Prio | Sujet | Constat | Recommandation |
|---|---|---|---|
| 🟠 | **Vocabulaire et langue** | Le menu affiche « Dashboard » (anglais) et « ACADEMIQUE » (sans accent). L'onglet et le surtitre disent « Academic ». La page d'erreur est en anglais (« Error Occurred », « Go to Dashboard » dans `core/auth/error.ts`). | Tout en français : « Tableau de bord », « Académique ». Centraliser les libellés des modules dans un seul fichier. |
| 🟠 | **Surtitres de page** | Cinq formes différentes relevées : « Academic », « Paramètres Academic », « Gestion des utilisateurs », « Gestion de l'identité », « Compte utilisateur ». Le menu dit « Horaires en attente » mais la page s'intitule « Liste des horaires ». « Liste des candidats » s'affiche au-dessus de « 2 candidature(s) ». | Une règle unique : surtitre = module, titre = écran, tous deux identiques au menu. |
| 🟠 | **Pages Paramètres** | Trois niveaux de titre s'empilent : « Paramètres » + onglets, puis pastilles, puis une barre d'actions qui répète le module. | Garder les onglets et les pastilles, retirer le surtitre de la barre d'actions dans ces pages (ou n'y laisser qu'un fil d'Ariane). |
| 🟠 | **Boutons d'action** | « Nouveau » est en bleu ciel plein, alors que la couleur principale est un bleu-vert. « Nouvelle candidature » est en contour. Pour ouvrir une fiche, une liste utilise « Détails » (bouton plein) et les autres une flèche en contour. | Primaire = couleur du thème, un seul style pour « Nouveau / Nouvelle », un seul style pour « Ouvrir ». Créer un petit catalogue (documentation des boutons ou composant `app-row-open`). |
| 🟠 | **Tableaux sur mobile** | Les colonnes sont tronquées et défilent horizontalement : l'email et les actions sont invisibles sans faire défiler (capture « Étudiants » en 390 px). | Sous 640 px, afficher une colonne principale (nom + sous-titre) et l'action, ou passer en cartes. |
| 🟠 | **Pagination** | Seule la liste des horaires en attente pagine côté serveur. Toutes les autres chargent jusqu'à 100 lignes et paginent dans le navigateur, et la liste des candidatures n'a pas de pagination visible. | Pagination serveur (`[lazy]`) partout où l'API la propose : cours, professeurs, étudiants, candidatures, utilisateurs. |
| 🟡 | **Chargement** | Squelettes de chargement uniquement sur les fiches étudiant et candidat ; ailleurs, roue du tableau ou rien. Sur « Cours », la roue tourne sans fin (bug P0). | Squelette commun pour les fiches, roue du tableau pour les listes, et une limite de temps avec message d'erreur. |
| 🟡 | **Création : page ou fenêtre** | Utilisateur, candidature et horaire se créent dans une page ; faculté, cours, UE et salle dans une fenêtre, sans règle apparente. | Fenêtre pour moins de 6 champs ; page au-delà ou quand il y a plusieurs étapes. |
| 🟡 | **Erreurs** | La lecture de `ProblemDetail` (`detail`, `invalid_fields`) est recodée dans une vingtaine de pages, et chaque page déclare son propre `p-toast`. | Un utilitaire `readApiError()` et un service de notification partagé. |
| 🟡 | **Données de référence** | Année « 2026-2026 » pour une période du 15/10/2026 au 14/10/2027 : le libellé saisi n'est pas contrôlé. | Proposer le libellé à partir des dates (« 2026-2027 ») et le valider. |

---

## 5. Points techniques

| Prio | Sujet | Constat | Recommandation |
|---|---|---|---|
| 🔴 | **Cause racine des filtres ignorés** | Les paramètres de requête sont construits à la main, en camelCase, dans 5 services. | Un utilitaire `toApiParams()` en snake_case, utilisé par tous les services, avec des tests. |
| 🟠 | **Session** | `current_user` (profils, autorisations, email, faculté) et les jetons sont stockés en `localStorage`. Les autorisations ne sont pourtant pas dans le JWT. | Garder le profil en mémoire et le recharger au démarrage via `/auth/refresh-token`. Garder le jeton d'accès en mémoire. Le cookie `HttpOnly` pour le jeton de rafraîchissement dépend du backend. Stratégie détaillée le 26/10. |
| 🟠 | **Tests** | `core/auth/error.spec.ts` fait planter Karma (le composant s'appelle `Error` et masque l'objet global). Deux tests de `academic-home-redirect.spec.ts` sont rouges. Le lint signale 3 erreurs dans `candidate-status-stats-widget.ts`. | Renommer le composant en `ErrorPage`, aligner les specs, corriger le lint. La consigne de `AGENTS.md` (« bloquer la fusion si les tests échouent ») n'est pas tenue aujourd'hui. |
| 🟡 | **Taille des pages** | Plusieurs composants dépassent 700 lignes : formulaire d'horaire (1 359), création de candidature (1 223), fiche candidat (954), fiche utilisateur (880), fiche professeur (860), fiche faculté (784), fiche étudiant (772). | Extraire des composants de présentation sur le modèle du dossier candidat (en-tête, rubriques, documents). |
| 🟡 | **Outillage** | Le cache de tests Karma a atteint 22 Go. Les dépendances du conteneur Docker ne se mettent pas à jour avec le `package.json`. | Passer à Vitest. Documenter la recréation du conteneur (`--renew-anon-volumes`). |
| 🟡 | **Tableau de bord** | Les compteurs sont calculés en chargeant des listes de 100 éléments (professeurs, utilisateurs). | Lire `total_elements` avec `size=1`, comme le widget des candidatures. |

---

## 6. Plan proposé

| Lot | Contenu | Résultat attendu |
|---|---|---|
| **A — P0 contrats** | `toApiParams()` + correction des 13 paramètres ; liste des cours paginée ; contrat des UE (`program_level_ids[]`, `curriculum[]`) ; professeurs et étudiants sur les routes réelles ; suppression du panneau « Étudiants inscrits » ou remplacement par une liste par promotion. | Plus aucun 404, plus aucun filtre ignoré, la liste des cours fonctionne. |
| **B — Portées** | Menus et routes de consultation acceptant toute portée (`hasScope`), actions selon create / update / delete, écrans en lecture seule. Module par module : Academic, Admission, puis Scheduling (`timetable:*:faculty`). | Un SAF ou un secrétaire académique voit ses écrans, limités à sa faculté. |
| **C — Harmonisation UI** | Libellés en français ; règle surtitre / titre ; styles de boutons ; tableaux sur mobile ; pagination serveur ; squelettes ; `readApiError()`. | Une interface cohérente d'un module à l'autre. |
| **D — Fonctions manquantes** | Duplication de semaine, sessions partagées, avertissements de double réservation ; curriculum et cours des UE ; `/course-assignments/me` ; gestion des privilèges ; `PUT /candidates/{id}`. | Couverture de l'API au-delà de 95 %. |
| **E — Socle** | Session en mémoire, tests rouges, lint, Vitest, découpage des grandes pages. | Une base saine pour la suite. |

**Données de test encore présentes** dans la base de dev :
- la candidature « Candidat Portail Test10261145 » et son compte ;
- le professeur « Test Saf10211235 », son compte et son mandat SAF ;
- la faculté « Faculté Test SAF 10211235 ».

Elles peuvent être supprimées sur demande.
