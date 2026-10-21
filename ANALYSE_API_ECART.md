# Smart-campus — Écart API ↔ front Angular et plan de tâches

- **Référence** : `api-docs.json` (OpenAPI 3.1), fourni le 21/10/2026.
- **Code analysé** : branche `feature/Scheduling`, avec les modifications non commitées.
- **Contrôle croisé** : les contrôleurs du backend ont été lus sans être modifiés (`C:\dev\Java\smart-campus-backend`, commit `296b7c3` du 20/10/2026), pour confirmer les noms réels des paramètres et des routes.

Légende : ✅ OK · ⚠️ Partiel · ❌ Absent · 🐞 Erroné · ⚪ Non requis par l'UI actuelle

---

## 0. Synthèse

**Cause racine principale (P0)** : plusieurs services envoient leurs paramètres de requête en **camelCase**. L'API et le backend (`@RequestParam(name = "program_level_id")`, etc.) attendent du **snake_case**. Il n'existe aucun intercepteur de conversion (seul `core/auth/interceptors/auth.interceptor.ts` est présent). Spring **ignore silencieusement** les paramètres inconnus. Les filtres ne sont donc pas appliqués, et rien ne le signale à l'écran.

| Service | Envoyé | Attendu | Conséquence |
|---|---|---|---|
| `timetable.service.ts:53-56` | `academicYearId`, `facultyId`, `programId`, `programLevelId` | `academic_year_id`, `faculty_id`, `program_id`, `program_level_id` | Le calendrier, la liste « en attente » et la reprise après un 409 reçoivent les horaires de **toutes** les promotions et facultés. |
| `timetable.service.ts:30` | `referenceDate` | `reference_date` | `/timetables/me/week` renvoie toujours la semaine courante : l'étudiant ne peut pas changer de semaine. |
| `timetable-entry.service.ts:36` | `referenceDate` | `reference_date` | Le calendrier admin affiche les séances de la semaine **courante** au lieu de celles de l'horaire chargé. |
| `candidate.service.ts:80` | `facultyId` | `faculty_id` | Le filtre par faculté des candidatures est ignoré. |
| `course-unit.service.ts:21` | `knowledgeSkillsBloc` | `knowledge_skills_bloc` | Le filtre par bloc est ignoré. |
| `student.service.ts:24-45` | `gender`, `level_id`, `nationality`, `matricule`, `q` | `program_level_id`, `academic_year_id`, `search` | Les filtres ne s'appliquent qu'à la page reçue, côté client, et le total devient faux. |

**Autres P0** : des routes appelées n'existent pas et des contrats ont changé (unités d'enseignement, liste des cours, profil utilisateur, portail candidat). Le détail est donné plus bas.

---

## 1. Matrice d'écart

### 1.1 Identity

| Endpoint | Méthode | Statut | Écart constaté | Fichier(s) |
|---|---|---|---|---|
| `/auth/login` | POST | ✅ | — | `core/auth/services/auth.service.ts:29` |
| `/auth/register` | POST | ⚠️ | `RegisterRequest.faculty_id` est typé `null` (littéral) et toujours envoyé à `null`. Impossible de rattacher un SAF à sa faculté à la création. | `identity/users/models/user.model.ts:21`, `identity/users/pages/user-create/user-create.ts:118` |
| `/auth/refresh-token` | POST | ✅ | — | `auth.service.ts:154` |
| `/auth/logout` | POST | ✅ | — | `auth.service.ts:150` |
| `/auth/forgot-password` | POST | ✅ | — | `auth.service.ts:168` |
| `/auth/reset-password` | POST | ⚠️ | La regex du mot de passe est contrôlée à la main, par morceaux, au lieu du `pattern` de l'API (8 à 16 caractères, jeu de caractères fermé). À confirmer : un mot de passe peut-il passer le front puis échouer côté serveur ? | `core/auth/reset-password/reset-password.ts:56` |
| `/users` | GET | ✅ | `page`, `size` et `sort` sont envoyés à plat (voir 📮 Pageable). | `identity/users/services/user.service.ts` (`getUsers`) |
| `/users/{userId}` | GET | ⚠️ | Utilisé aussi pour **son propre** profil au lieu de `/users/me`. | `identity/users/pages/user-profile/user-profile.ts:140` |
| `/users/{userId}` | PUT | 🐞 | (1) Le profil personnel enregistre via cette route, réservée aux administrateurs : **403 pour un non-admin**. (2) `faculty_id` n'est jamais envoyé depuis la fiche utilisateur. | `user-profile.ts:318`, `identity/users/pages/user-detail/user-detail.ts` |
| `/users/{userId}` | DELETE | ✅ | — | `user.service.ts` |
| `/users/{userId}/enable` · `/disable` | PUT | ✅ | — | `user.service.ts` |
| `/users/{userId}/profiles/{profileId}` | PUT / DELETE | ✅ | — | `user.service.ts` |
| `/users/{userId}/privileges/{privilegeId}` | PUT / DELETE | ✅ | — | `user.service.ts` |
| `/users/me` | GET | ❌ | Non utilisé (repli sur `/users/{id}`). | — |
| `/users/me` | PUT | ❌ | Non utilisé (voir 🐞 ci-dessus). `UpdateOwnProfileRequest` = `username` + `email`. | — |
| `/users/me/password` | PUT | ✅ | `refresh_token` envoyé, regex conforme. | `identity/pages/user-password/user-password.ts:38-80`, `user-profile.ts:106-184` |
| `/users/me/avatar/upload-url` | GET | ✅ | — | `user.service.ts` |
| `/users/me/avatar/confirm` | POST | ✅ | — | `user.service.ts` |
| *(hors doc)* `/users/me/avatar` | DELETE | 🐞 | La route n'existe ni dans la doc ni dans `UserApi.java`. « Supprimer l'avatar » échoue. | `user.service.ts` (`deleteCurrentUserAvatar`), `user-profile.ts:278` |
| `/profiles` | GET / POST | ✅ | — | `identity/services/identity-management.service.ts` |
| `/profiles/{profileId}` | GET / DELETE | ✅ | — | idem |
| `/profiles/{profileId}/roles` | POST | ✅ | — | idem |
| `/roles` | GET / POST | ✅ | Filtre `name` branché, pattern `^ROLE_[A-Z_]+$` respecté. | idem, `identity/pages/role-management/role-management.ts:114` |
| `/roles/{roleId}` | GET | ✅ | — | idem |
| `/roles/{roleId}/privileges` | POST | ✅ | — | idem |
| `/privileges` | GET | ✅ | Chargement de toutes les pages. | idem (`getAllPrivileges`) |
| `/privileges` | POST | ❌ | Création de privilège absente. | — |
| `/privileges/{privilegeId}` | GET / DELETE | ❌ | Absents. | — |

Contrats : `User` et `AuthenticatedUser` portent bien `authorities[]` et `faculty_id` (`core/auth/models/auth.model.ts`). `faculty-scope.service.ts:17` les exploite.

### 1.2 Academic

| Endpoint | Méthode | Statut | Écart constaté | Fichier(s) |
|---|---|---|---|---|
| `/academic-years` | GET / POST | ✅ | — | `academic/services/academic-year.service.ts`, `academic-catalog.service.ts` |
| `/academic-years/current` | GET | ✅ | — | idem |
| `/academic-years/{id}/activate` · `/close` | PATCH | ✅ | — | `academic-year.service.ts` |
| `/semesters` | GET / POST | ✅ | — | `semester.service.ts` |
| `/semesters/{id}` | GET | ⚪ | — | — |
| `/semesters/{id}` | PUT / DELETE | ✅ | — | `semester.service.ts` |
| `/semesters/academic-year/{id}` | GET | ✅ | — | idem |
| `/faculties` | GET / POST | ✅ | `page=0&size=100` envoyés à un endpoint non paginé (sans effet). | `faculty.service.ts`, `academic-catalog.service.ts:136` |
| `/faculties/{id}` | GET / PUT / DELETE | ✅ | — | `faculty.service.ts` |
| `/faculties/{id}/leadership` | GET | ⚠️ | `resolveAttachedFaculty` interroge le leadership de **toutes** les facultés (N+1 appels) pour trouver celle d'un utilisateur. `UserContextResponse.faculty_id` rend ce parcours inutile. | `faculty.service.ts` (`resolveAttachedFaculty`), `pages/course-detail/course-detail.ts:423`, `pages/faculty-detail/faculty-detail.ts:234` |
| `/faculties/{id}/leadership/assign` | POST | ✅ | Enum `DEAN` / `VICE_DEAN` / `SAF` conforme. | `faculty.service.ts`, `models/faculty.model.ts` |
| `/faculties/{id}/leadership/{assignmentId}` | DELETE | ✅ | — | idem |
| `/programs` | GET / POST | ✅ | — | `program.service.ts`, `academic-catalog.service.ts` |
| `/programs/{id}` | GET | ⚪ | Le catalogue filtre la liste complète. | — |
| `/programs/{id}` | PUT | ⚠️ | **Deux PUT successifs** : métadonnées, puis niveaux. C'est un contournement d'un bug Hibernate (« insert-before-delete »). Une erreur sur le second PUT laisse le programme à moitié modifié. | `program.service.ts` (`update`) |
| `/programs/{id}` | DELETE | ✅ | — | idem |
| `/programs/faculty/{facultyId}` | GET | ✅ | — | idem |
| `/levels` | GET / POST | ✅ | `LevelRequest.order` conforme à `CreateLevelRequest`. | `level.service.ts`, `models/level.model.ts` |
| `/levels/{id}` | GET | ⚪ | — | — |
| `/levels/{id}` | PUT / DELETE | ✅ | — | `level.service.ts` |
| `/course-units` | POST | 🐞 | Envoie `program_level_id` (une seule valeur). L'API exige `program_level_ids: uuid[]` (au moins 1) + `knowledge_skills_bloc` → **400**. Le tronc commun ne peut pas être créé. | `models/course-unit.model.ts`, `pages/course-unit-list/course-unit-list.ts:229-239` |
| `/course-units/{id}` | GET | 🐞 | Le modèle attend `program_level_id` et `knowledge_skills_bloc` à la racine. `CourseUnitResponse` renvoie `curriculum[] {program_level_id, knowledge_skills_bloc}` : le détail lit `unit.program_level_id`, qui vaut `undefined`. | `models/course-unit.model.ts`, `pages/course-unit-detail/course-unit-detail.ts:231` |
| `/course-units/{id}` | PUT | ⚠️ | `UpdateCourseUnitRequest` = `code` seul. Le front envoie aussi bloc et niveau, qui sont ignorés : un changement de bloc ou de niveau dans le formulaire **ne s'applique pas**, sans message. | `course-unit-list.ts:238` |
| `/course-units/{id}` | DELETE | ⚠️ | 409 « sessions à venir » sans message dédié (À confirmer). | `course-unit.service.ts` |
| `/course-units/program-level/{plId}` | GET | 🐞 | Paramètre `knowledgeSkillsBloc` au lieu de `knowledge_skills_bloc`. La réponse (`ProgramLevelCourseUnitResponse`) correspond au modèle. | `course-unit.service.ts:21` |
| `/course-units/{id}/program-levels/{plId}` | POST / PUT / DELETE | ❌ | Tronc commun et bloc par promotion absents. | — |
| `/course-units/{id}/courses` | GET / POST | ❌ | Rattachement de cours avec crédits propres absent. | — |
| `/course-units/{id}/courses/{courseId}` | DELETE | ❌ | Détachement absent (avec 409). | — |
| `/courses` | GET | 🐞 | Typé `Course[]` alors que l'API renvoie un `PagedResponse` : `[...courses]` plante (« not iterable ») ou la liste reste vide. Ni `faculty_id`, ni `search`, ni pagination. `findById` passe par cette liste. | `course.service.ts` (`getAll`, `findById`), `pages/course-list/course-list.ts:302-320`, `pages/my-courses/my-courses.ts:85`, `pages/professor-detail/professor-detail.ts:558`, `pages/course-detail/course-detail.ts:409` |
| `/courses` | POST | ⚠️ | `CourseRequest.course_unit_id` est obligatoire côté front. L'API accepte `course_unit_id` **ou** `faculty_id` : un cours sans UE est impossible. | `models/course.model.ts` |
| `/courses/{id}` | PUT | ⚠️ | Envoie `course_unit_id`, absent de `UpdateCourseRequest` (ignoré). `credits` n'est pas présenté comme un crédit **par défaut**. | idem |
| `/courses/program-level/{plId}` | GET | ✅ | — | `course.service.ts`, `scheduling/timetable/pages/timetable-form/timetable-form.ts:283` |
| `/course-assignments` | POST | ✅ | — | `course-assignment.service.ts` |
| `/course-assignments/{id}` | PUT | ✅ | — | idem |
| `/course-assignments/professor/{id}` · `/course/{id}` | GET | ✅ | — | idem |
| `/course-assignments/me` | GET | ❌ | « Mes cours » reconstitue ses cours avec `resolveCurrent` + `courses.getAll()`, lui-même cassé. | `pages/my-courses/my-courses.ts:56-85` |
| `/professors` | GET | ⚠️ | `size=100` figé, sans pagination serveur. `faculty_id`, `professor_grade_id` et `search` ne sont pas utilisés. Au-delà de 100 enseignants, la liste et `ProfessorLabelService` sont tronqués. | `professor.service.ts` (`getAll`), `scheduling/timetable/services/professor-label.service.ts:21` |
| *(hors doc)* `/professors/faculty/{id}` · `/professors/grade/{id}` | GET | 🐞 | Routes inexistantes (vérifié dans `ProfessorApi.java`). La liste d'un SAF et le choix d'enseignant échouent. | `professor.service.ts` (`getByFaculty`, `getByGrade`), `pages/professor-list/professor-list.ts:153`, `pages/professor-detail/professor-detail.ts:585`, `pages/course-detail/course-detail.ts:468` |
| `/professors` | POST | ⚠️ | Ajoute `grade_id` (doublon de `professor_grade_id`), `matricule` et `user_id`, absents du schéma. | `professor.service.ts` (`toProfessorApiBody`), `models/professor.model.ts` |
| `/professors/{id}` | GET / PUT / DELETE | ✅ | — | `professor.service.ts` |
| `/professors/me` | GET | ✅ | — | idem |
| `/professor-grades` | GET / POST | ✅ | `page/size` superflus. | `professor-grade.service.ts` |
| `/professor-grades/{id}` | GET | ⚪ | — | — |
| `/professor-grades/{id}` | PUT / DELETE | ✅ | — | idem |
| `/students` | GET | 🐞 | Paramètres hors contrat (`gender`, `level_id`, `nationality`, `matricule`, `q`). `program_level_id`, `academic_year_id` et `search` sont absents. Le filtrage client sur la page courante fausse `total_elements`. Le filtre de niveau compare `student.level_id`, que `StudentResponse` ne renvoie pas : **toute la page disparaît**. | `student.service.ts` (`getAll`), `models/student.model.ts:76-150`, `pages/student-list/student-list.ts:178-207` |
| `/students/{id}` | GET / PUT | ✅ | PUT : `StudentRequest` ajoute `faculty_id`, `program_id`, `level_id` et `academic_year_id`, ignorés (À confirmer : le backend ne rejette pas ces champs inconnus). | `student.service.ts`, `pages/student-detail/student-detail.ts:363-396` |
| `/students/me` | GET | ❌ | Pas de fiche « mon dossier étudiant ». | — |
| *(hors doc)* `/students/course/{id}`, `/courses/{id}/students` | GET | 🐞 | Routes inexistantes. Le repli 404 → `[]` cache le problème : le panneau « Étudiants inscrits » est **toujours vide**. | `student.service.ts` (`getByCourse`), `components/course-enrolled-students/course-enrolled-students.ts:50` |
| `/candidates` | GET | 🐞 | `facultyId` au lieu de `faculty_id`. `status`, `page`, `size` et `sort` sont OK. | `admission/services/candidate.service.ts:80` |
| `/candidates` | POST | ✅ | Requête publique via `PUBLIC_API_REQUEST`. | `candidate.service.ts` (`submit`) |
| `/candidates/{id}` | GET | ✅ | — | idem |
| `/candidates/{id}` | PUT | ❌ | La modification d'un dossier par le personnel est absente. | — |
| `/candidates/me` | GET | 🐞 | Le front appelle `/candidates/users/{userId}`, **inexistant** (vérifié dans `CandidateApi.java`). Le portail candidat ne charge pas le dossier. | `candidate.service.ts` (`getByUserId`, `getMine`), `admission/pages/candidate-portal/candidate-portal.ts:337` |
| `/candidates/me` | PUT | ⚠️ | L'appel est OK. `canEditOwn` (DRAFT / PENDING) est cohérent, mais le 409 « plus modifiable » n'a pas de message dédié (À confirmer). | `candidate.service.ts` (`updateMine`, `canEditOwn`) |
| `/candidates/{id}/validate` · `/reject` | POST | ✅ | Motif obligatoire, puis rechargement. | idem |
| `/candidates/{id}/documents/upload-url` · `/confirm` | POST | ⚠️ | Le flux en deux temps est correct, mais `uploadDocuments` **avale les erreurs** (`catchError → of(null)`) : un document perdu passe inaperçu. Extension envoyée avec un point (`.pdf`) : À confirmer côté backend. | `candidate.service.ts` (`uploadDocuments`, `uploadDocumentWithUrlRefresh`) |
| `/candidates/{id}/documents/{docId}/download-url` | GET | ⚠️ | Utilisé aussi par le **portail candidat**. La route est réservée au personnel : 403 probable (À confirmer). | `candidate.service.ts` (`resolveDocumentViewUrl`), `candidate-portal.ts:570-595` |
| `/candidates/me/documents/{docId}/download-url` | GET | ❌ | Non utilisé. | — |

### 1.3 Scheduling

| Endpoint | Méthode | Statut | Écart constaté | Fichier(s) |
|---|---|---|---|---|
| `/timetables` | GET | 🐞 | Paramètres en camelCase, donc ignorés (voir §0). Conséquences : (1) le **calendrier** reçoit les horaires VALIDATED de toutes les promotions et les filtre seulement par semaine : une autre promotion peut s'afficher, et au-delà de 100 horaires des semaines disparaissent ; (2) la reprise **après 409** peut retenir l'horaire d'une **autre promotion** ; (3) le compteur et la liste « en attente » d'un SAF ne sont pas restreints à sa faculté côté requête. Tri `weekStart,asc` : À confirmer (nom de propriété Spring). Filtre `week` : évité, car il renvoyait 500 lors du test (À confirmer sur `296b7c3`). | `scheduling/timetable/services/timetable.service.ts:50-71`, `pages/timetable/timetable.ts:195`, `pages/timetable-form/timetable-form.ts:831`, `pages/timetable-pending/timetable-pending.ts:128`, `services/timetable-scope.service.ts:17` |
| `/timetables` | POST | ✅ | 409 et 400 traduits via `detail`. Normalisation au lundi faite côté front. | `timetable.service.ts`, `utils/timetable-error.ts`, `timetable-form.ts:820-848` |
| `/timetables/{id}` | GET / DELETE | ✅ | — | `timetable.service.ts` |
| `/timetables/{id}/status` | PATCH | ✅ | Transitions DRAFT → SUBMITTED → VALIDATED, SUBMITTED → DRAFT, VALIDATED → SUBMITTED : conformes. | `models/timetable.model.ts:80-124` |
| `/timetables/{id}/duplicate` | POST | ❌ | La duplication de semaine (tout ou rien, 422 par position) est absente. | — |
| `/timetables/me/week` | GET | 🐞 | `referenceDate` au lieu de `reference_date` : toujours la semaine courante. Le 404 est bien traité comme une semaine vide. | `timetable.service.ts:30`, `pages/my-timetable/my-timetable.ts:114-133` |
| `/timetable-entries` | POST | ⚠️ | Lot tout ou rien et erreurs 422 par `index` : OK. Mais : `warnings[]` (`PROFESSOR_DOUBLE_BOOKED`) **ignoré** ; `shared_with_program_level_ids` absent ; aucun découpage au-delà de 200 entrées. | `services/timetable-entry.service.ts:18`, `models/timetable-entry.model.ts`, `timetable-form.ts:876-905` |
| `/timetable-entries/{id}` | GET | ⚪ | — | — |
| `/timetable-entries/{id}` | PUT | ⚠️ | `warnings[]` ignoré. `shared_with_program_level_ids` absent. | `timetable-entry.service.ts:25` |
| `/timetable-entries/{id}` | DELETE | ✅ | — | idem |
| `/timetable-entries/timetable/{id}` | GET | ✅ | — | idem, `timetable-form.ts:654` |
| `/timetable-entries/timetable/{id}/week` | GET | 🐞 | `referenceDate` ignoré : séances de la semaine courante au lieu de `week_start`. Les semaines passées et futures du calendrier sont **vides**. | `timetable-entry.service.ts:36`, `pages/timetable/timetable.ts:203` |
| `/timetable-entries/timetable/{id}/range` | GET | ❌ | — | — |
| `/timetable-entries/room/{roomId}` | GET | ❌ | Pas de vue d'occupation des salles. | — |
| `/timetable-entries/course-assignment/{id}` | GET | ✅ | — | `timetable-entry.service.ts:41`, `my-timetable.ts:170` |
| `/rooms` | GET / POST | ✅ | — | `scheduling/services/room.service.ts`, `models/room.model.ts` |
| `/rooms/{id}` | GET / PUT / DELETE | ✅ | — | idem |

Contrats Scheduling :

- `TimetableEntry` ne déclare ni `host_program_level_id`, ni `audience_program_level_ids`, ni `warnings` (`models/timetable-entry.model.ts:4-22`).
- `StudentTimetableEntry` est complet (`room_location`, `room_type`, `room_link`).
- Les enums `SessionType` et `TimetableStatus` sont conformes.

---

## 2. Constats classés

### 🐞 Corrections (le code contredit l'API)

1. **C1 — Paramètres de requête en camelCase** dans cinq services (§0). Effets : filtres ignorés, calendrier faux, portée SAF non appliquée à la requête.
2. **C2 — Calendrier admin** : `getForWeek` renvoie la semaine courante (C1), et la liste n'est pas restreinte à la promotion. Il faut charger les séances avec `getByTimetable(id)` ou `reference_date`, et filtrer `program_level_id`.
3. **C3 — Reprise après 409 à la création d'un horaire** : peut ouvrir l'horaire d'une autre promotion (C1).
4. **C4 — Unités d'enseignement** : `POST` sans `program_level_ids[]` (400). `GET /{id}` lu avec l'ancien modèle. `PUT` laisse croire qu'il modifie le bloc et le niveau.
5. **C5 — `GET /courses`** traité comme un tableau alors que c'est un `PagedResponse`. Liste des cours, « Mes cours » et fiche enseignant cassés.
6. **C6 — Routes inexistantes appelées** :
   - `/professors/faculty/{id}` et `/professors/grade/{id}` ;
   - `/students/course/{id}` et `/courses/{id}/students` ;
   - `/candidates/users/{id}` ;
   - `DELETE /users/me/avatar`.
7. **C7 — Profil personnel** enregistré via `PUT /users/{id}` (403 pour un non-admin). Il faut passer par `GET` et `PUT /users/me`.
8. **C8 — Étudiants** : filtres hors contrat, et filtrage client qui vide la page et fausse les totaux.
9. **C9 — Portail candidat** : pour ses documents, il utilise la route d'URL de téléchargement réservée au personnel (À confirmer : 403).

### 🔧 Améliorations

- **A1** : avertissements `PROFESSOR_DOUBLE_BOOKED` non affichés après une création ou une modification de séance.
- **A2** : erreurs des documents de candidature avalées.
- **A3** : gestion des 409 « métier » sans message dédié :
  - suppression d'UE ou détachement de cours avec des sessions à venir ;
  - `PUT /candidates/me` sur un dossier figé.
- **A4** : lecture de `ProblemDetail` dupliquée page par page (`errorDetail` dans `student-list.ts:315`, `candidate-detail.ts`, `candidate-management.ts` ; `invalid_fields` dans 4 pages ; `utils/timetable-error.ts` côté Scheduling). Il faut un utilitaire partagé.
- **A5** : `ProfessorService.getAll` est limité à 100. Il faut une pagination serveur, `search`, `faculty_id` et `professor_grade_id`.
- **A6** : `resolveAttachedFaculty` fait N+1 appels. Le `faculty_id` du contexte suffit.
- **A7** : `Program.update` en deux PUT, sans retour arrière.
- **A8** : corps de `POST /professors` pollué (`grade_id`, `matricule`, `user_id`).
- **A9** : `RegisterRequest.faculty_id` figé à `null`, et `faculty_id` absent de la fiche utilisateur. C'est bloquant pour rattacher un SAF à sa faculté depuis l'UI.
- **A10** : pas de découpage des lots de séances au-delà de 200.
- **A11** : `page/size` envoyés à des endpoints non paginés (faculties, levels, programs, academic-years, professor-grades). Sans effet, mais trompeur.

### ✨ Nouveautés (l'API le permet, le front ne le fait pas)

- **N1** : duplication d'une semaine d'horaire (`POST /timetables/{id}/duplicate`), avec la liste des sessions rejetées en 422.
- **N2** : sessions partagées et tronc commun dans l'horaire (`shared_with_program_level_ids`, `audience_program_level_ids`, `host_program_level_id`).
- **N3** : occupation d'une salle (`/timetable-entries/room/{id}?from&to`).
- **N4** : chargement par plage (`/timetable-entries/timetable/{id}/range`) pour la vue mois.
- **N5** : curriculum des UE :
  - inscrire, changer le bloc et retirer une promotion (`/course-units/{id}/program-levels/{plId}`) ;
  - cours d'une UE avec crédits propres (`/course-units/{id}/courses`).
- **N6** : création d'un cours sans UE (`faculty_id`), et recherche paginée des cours.
- **N7** : « Mes cours » via `/course-assignments/me`.
- **N8** : « Mon dossier étudiant » via `/students/me`.
- **N9** : modification d'une candidature par le personnel (`PUT /candidates/{id}`).
- **N10** : documents du candidat via `/candidates/me/documents/{id}/download-url`.
- **N11** : gestion complète des privilèges (création, consultation, suppression).

### 📮 À remonter au backend

| # | Point soumis | Verdict | Preuve |
|---|---|---|---|
| B1 | `POST /professors` renvoie 200 au lieu de 201 | **Confirmé** | `paths./api/v1/professors.post.responses` : seulement `"200"` |
| B2 | `DELETE /professors/{id}` renvoie 200 au lieu de 204 | **Confirmé** | idem, `delete.responses` : `"200"` |
| B3 | Pas de `GET` ni de `DELETE` sur `/courses/{id}` | **Confirmé** | Seul `put` est documenté. `CourseApi.java` n'expose que `@PutMapping("/{id}")` |
| B4 | Pas de liste globale des course units | **Confirmé** | Seulement `/course-units/program-level/{id}` (aucun `GET /course-units`) |
| B5 | Pas de `PUT /timetables/{id}` | **Confirmé** | `get` + `delete` seulement. C'est pourquoi le front supprime puis recrée l'horaire quand l'en-tête change. |
| B6 | `Pageable` exposé comme un objet de query (users, roles, profiles, privileges) | **Confirmé** | Paramètre `pageable` (`$ref Pageable`, `required: true`). `@ParameterObject` manque, alors qu'il est présent sur timetables, students, professors, courses et candidates. |
| B7 | `minItems: 0` sur les entrées alors que la description dit 1 à 200 | **Confirmé** | `CreateTimetableEntryRequest.entries` : `maxItems 200, minItems 0` |
| B8 | Erreurs 4xx typées avec le schéma de succès | **Confirmé** | Par exemple `/timetables` 409 → `TimetableResponse`, `/timetable-entries` 422 → `TimetableEntryResponse[]`. Seuls les endpoints `/auth/*` utilisent `ProblemDetail`. |
| B9 | `SemesterResponse` et `AcademicYearResponse` en `date-time` alors que les requêtes sont en `date` | **Confirmé** | `start_date` et `end_date` en `format: date-time` dans les réponses, `format: date` dans `Create*` et `Update*` |
| B10 | Descriptions en français dans les schémas Students | **Confirmé** | `UpdateStudentRequest`, `academic_background`, `emergency_contact`, `origin`, `tutor` |

Défauts supplémentaires relevés :

| # | Défaut | Preuve |
|---|---|---|
| B11 | Le format des erreurs par lot (`errors[].index`, `code`, `message`) n'est pas documenté, ni pour les entrées ni pour `duplicate` (422). | Le front le déduit de l'implémentation : `utils/timetable-error.ts:36-57`. |
| B12 | `StudentResponse` ne contient ni faculté, ni programme, ni promotion, ni année académique, alors que la liste filtre dessus. On ne peut pas afficher la promotion d'un étudiant. | Schéma `StudentResponse` |
| B13 | `CourseResponse` n'indique pas les UE du cours. | Schéma `CourseResponse` |
| B14 | `CreateLevelRequest.order` contre `LevelResponse.level_order` : nommage incohérent. | Schémas |
| B15 | `PUT /users/me/password` déclare l'en-tête `Authorization` comme paramètre obligatoire, ce qui fait doublon avec `bearerAuth`. | `paths./api/v1/users/me/password.put.parameters` |
| B16 | `PUT /programs/{id}` : remplacer la liste des niveaux échoue en un seul appel (Hibernate insère avant de supprimer) et oblige le front à faire deux PUT. | Commentaire dans `program.service.ts` (`update`) |
| B17 | À confirmer : `GET /timetables?week=…` renvoyait 500 (paramètre date non typé dans `TimetableRepository.findAllByFilters`). | Commentaire dans `pages/timetable/timetable.ts:191-193` |
| B18 | Aucune réponse 403 n'est documentée sur les routes à portée (SAF, staff), et aucun 409 n'est documenté sur `PATCH /timetables/{id}/status` ni sur `DELETE /timetables/{id}` d'un horaire validé. | Schémas des réponses |

---

## 3. Plan de tâches

| ID | Module | Type | Titre | Description | Fichiers impactés | Dépendances | Priorité | Effort | Critères d'acceptation |
|---|---|---|---|---|---|---|---|---|---|
| X-01 | Transverse | 🐞 | Utilitaire de paramètres snake_case | `toApiParams(record)` ignore les valeurs vides, gère `sort[]` et impose des clés snake_case typées. Les services l'utilisent à la place de `HttpParams` construits à la main. | `shared/http/api-params.ts` (nouveau) + spec | — | P0 | S | Tests unitaires : clés snake_case, valeurs vides omises, `sort` répété. |
| SCH-01 | Scheduling | 🐞 | Filtres `GET /timetables` et `reference_date` | Passer `TimetableService` et `TimetableEntryService` au snake_case. Vérifier le tri `week_start`. | `timetable.service.ts`, `timetable-entry.service.ts`, `timetable-scope.service.ts` + specs | X-01 | P0 | S | Les specs HTTP vérifient `program_level_id`, `faculty_id`, `status`, `reference_date`. La liste d'un SAF ne contient que sa faculté. |
| SCH-02 | Scheduling | 🐞 | Calendrier admin fiable | Charger les séances avec `getByTimetable(id)`. Filtrer `program_level_id` (défense en profondeur). Paginer jusqu'à épuisement, ou utiliser `week` si B17 est corrigé. | `pages/timetable/timetable.ts` + spec | SCH-01 | P0 | M | Une semaine passée ou future affiche ses séances. Aucune séance d'une autre promotion. Plus de 100 horaires gérés. |
| SCH-03 | Scheduling | 🐞 | Reprise après 409 sur la bonne promotion | Filtrer par `program_level_id` + `week_start`. | `timetable-form.ts` + spec | SCH-01 | P0 | S | Le 409 ouvre l'horaire de la même promotion et de la même semaine. |
| SCH-04 | Scheduling | 🐞 | Navigation de semaine pour l'étudiant | `reference_date` sur `/timetables/me/week`. | `timetable.service.ts`, `my-timetable.ts` + spec | SCH-01 | P0 | S | Semaine suivante → requête avec `reference_date` du lundi visé, séances correctes. |
| ACA-01 | Academic | 🐞 | Contrat Course Units | Modèle `CourseUnit` avec `curriculum[]`. Création avec `program_level_ids[]` + bloc. Modification du code seul. Lecture du détail via le curriculum. | `models/course-unit.model.ts`, `course-unit.service.ts`, `course-unit-list.ts`, `course-unit-detail.ts`, `course-list.ts` + specs | X-01 | P0 | M | Création OK (201). Le détail affiche les promotions et leur bloc. Le formulaire de modification ne propose plus que le code. Le filtre `knowledge_skills_bloc` est envoyé. |
| ACA-02 | Academic | 🐞 | Liste des cours paginée | `CourseService.list({faculty_id, search, page, size, sort})` → `PagedResponse<Course>`. `findById` est remplacé, faute de `GET /courses/{id}` (voir B3) : recherche par code, ou contexte de navigation. | `course.service.ts`, `course-list.ts`, `course-detail.ts`, `my-courses.ts`, `professor-detail.ts` + specs | X-01 | P0 | M | La liste s'affiche avec pagination serveur et recherche. Plus d'erreur « not iterable ». |
| ACA-03 | Academic | 🐞 | Enseignants : routes réelles | Supprimer `getByFaculty` et `getByGrade`. Utiliser `GET /professors?faculty_id&professor_grade_id&search`, paginé. Nettoyer le corps de création. | `professor.service.ts`, `professor-list.ts`, `professor-detail.ts`, `course-detail.ts`, `professor-label.service.ts` + specs | X-01 | P0 | M | Un SAF voit les enseignants de sa faculté. Pagination serveur. Le corps POST est conforme au schéma. |
| ACA-04 | Academic | 🐞 | Étudiants : filtres conformes | Paramètres `faculty_id`, `program_id`, `program_level_id`, `academic_year_id`, `search`. Supprimer le filtrage client et les filtres hors API (genre, nationalité). | `student.service.ts`, `models/student.model.ts`, `student-list.ts` (+ html) + specs | X-01 | P0 | M | Totaux exacts. Filtre de promotion fonctionnel. Plus de filtre hors contrat. |
| ACA-05 | Academic | 🐞 | « Étudiants inscrits » d'un cours | Retirer les appels aux routes inexistantes. Lister par `program_level_id` des promotions du cours, ou masquer le panneau. | `student.service.ts`, `course-enrolled-students.ts` | ACA-04 | P0 | S | Plus aucun appel 404. Le panneau affiche des données réelles, ou n'apparaît pas. |
| ACA-06 | Academic | 🐞 | Portail candidat : `/candidates/me` | `getMine()` → `GET /candidates/me`. Documents via `/candidates/me/documents/{id}/download-url`. `faculty_id` dans la liste du personnel. | `candidate.service.ts`, `candidate-portal.ts`, `candidate-management.ts` + specs | X-01 | P0 | S | Le candidat voit son dossier et ses documents. Le filtre par faculté fonctionne. |
| IDT-01 | Identity | 🐞 | Profil personnel via `/users/me` | `getMe()` et `updateMe(UpdateOwnProfileRequest)`. Supprimer l'appel `DELETE /users/me/avatar`, et masquer l'action en attendant le backend. | `user.service.ts`, `user-profile.ts` + specs | — | P0 | S | Un étudiant modifie son nom d'utilisateur et son email (200). Aucun appel à une route inexistante. |
| IDT-02 | Identity | 🔧 | Faculté de l'utilisateur | `faculty_id` optionnel à la création (`RegisterRequest`) et à la modification (`UpdateUserRequest`), avec sélecteur de faculté. Obligatoire pour un profil SAF. | `user.model.ts`, `user-create.ts`, `user-detail.ts` (+ html) + specs | — | P1 | S | Création d'un SAF avec sa faculté. Modification de la faculté. Le contexte de connexion reflète `faculty_id`. |
| X-02 | Transverse | 🔧 | Lecture unifiée des erreurs API | `readApiError(error)` → `{detail, invalidFields, batchErrors, status}`, reprenant `utils/timetable-error.ts`. Branché sur les pages qui dupliquent cette logique. | `shared/http/api-error.ts` (nouveau), pages concernées | — | P1 | M | Mêmes messages qu'aujourd'hui. Un seul utilitaire testé. |
| SCH-05 | Scheduling | 🔧 | Avertissements de double réservation | Ajouter `warnings[]` au modèle et afficher un toast « avertissement » après POST et PUT. | `timetable-entry.model.ts`, `timetable-form.ts` + spec | — | P1 | S | Une séance sur un enseignant déjà pris est enregistrée et l'avertissement s'affiche. |
| SCH-06 | Scheduling | 🔧 | Découpage des lots au-delà de 200 | Lots de 200 au plus, en séquence. Index d'erreur recalculé. | `timetable-form.ts` + spec | — | P2 | S | 250 séances donnent 2 POST. Une erreur à l'index 10 du 2ᵉ lot est rattachée à la ligne 210. |
| ACA-07 | Academic | 🔧 | Messages 409 métier | Messages dédiés : UE ou cours avec sessions à venir, dossier candidat figé. | pages UE, cours, portail | X-02 | P1 | S | Chaque 409 affiche le `detail` du backend, ou un message spécifique. |
| ACA-08 | Academic | 🔧 | Erreurs d'envoi des documents | `uploadDocuments` remonte les échecs par document. L'UI liste les documents non envoyés. | `candidate.service.ts`, `candidate-create.ts`, `candidate-portal.ts` | — | P1 | S | Un échec d'envoi est visible, et l'envoi peut être relancé. |
| ACA-09 | Academic | 🔧 | Faculté rattachée sans N+1 | Remplacer `resolveAttachedFaculty` par `faculty_id` du contexte (`FacultyScopeService`). | `faculty.service.ts`, `course-detail.ts`, `faculty-detail.ts` | — | P2 | S | Un seul appel, ou aucun. Même comportement. |
| ACA-10 | Academic | 🔧 | Nettoyage des requêtes non paginées | Retirer `page/size` des endpoints qui renvoient un tableau. | `academic-catalog.service.ts`, `professor-grade.service.ts` | — | P2 | S | Specs HTTP sans paramètre superflu. |
| SCH-07 | Scheduling | ✨ | Dupliquer une semaine | Action « Dupliquer vers… » (semaine cible) sur le formulaire et la liste. Sur 422, afficher la liste des sessions rejetées par position (date, heure). | `timetable.service.ts`, `timetable-form.ts`, `timetable-pending.ts`, dialogue + specs | SCH-01, X-02 | P1 | M | Copie réussie : l'horaire DRAFT s'ouvre. 422 : liste lisible, rien n'est créé. 409 : semaine déjà existante ou passée. |
| SCH-08 | Scheduling | ✨ | Sessions partagées et tronc commun | Choix des autres promotions dans la fenêtre de session (même faculté). Affichage « partagée avec… » côté hôte, « hébergée par… » côté invité, en lecture seule chez l'invité. | `timetable-entry.model.ts`, fenêtre de session, `timetable-form.ts`, calendrier + specs | ACA-01 | P1 | L | Une séance partagée apparaît dans les deux horaires. Le 409 sur un horaire invité validé est expliqué. |
| SCH-09 | Scheduling | ✨ | Occupation des salles | Vue calendrier par salle (`/timetable-entries/room/{id}`), et indication de disponibilité dans la fenêtre de session. | nouveau `pages/room-occupancy`, `room.service.ts` / `timetable-entry.service.ts`, route + specs | SCH-02 | P2 | M | La sélection d'une salle et d'une période affiche ses réservations. |
| SCH-10 | Scheduling | ✨ | Vue mois via `/range` | Utiliser `range` pour la vue mois au lieu d'un appel par semaine. | `timetable.ts`, `timetable-entry.service.ts` | SCH-02 | P2 | S | Vue mois : un appel par horaire et par plage. |
| ACA-11 | Academic | ✨ | Curriculum des UE | Inscrire une UE dans une autre promotion, changer son bloc par promotion, la retirer (409). | `course-unit.service.ts`, `course-unit-detail.ts` + specs | ACA-01 | P1 | M | Tronc commun créé depuis l'UI. Le bloc diffère par promotion. Le 409 est expliqué. |
| ACA-12 | Academic | ✨ | Cours d'une UE avec crédits propres | Lister, rattacher (crédits facultatifs) et détacher (409) les cours d'une UE. | `course-unit.service.ts`, `course-unit-detail.ts` + specs | ACA-01, ACA-02 | P1 | M | Les crédits par UE sont affichés et modifiables au rattachement. |
| ACA-13 | Academic | ✨ | Cours sans UE | Formulaire de cours : `course_unit_id` **ou** `faculty_id`. « Crédits » libellé comme crédit par défaut. | `models/course.model.ts`, `course-list.ts` / `course-detail.ts` | ACA-02 | P2 | S | Création d'un cours rattaché à la seule faculté (201). |
| ACA-14 | Academic | ✨ | Mes cours via `/course-assignments/me` | Remplacer la reconstitution actuelle. | `course-assignment.service.ts`, `my-courses.ts` | — | P1 | S | Un enseignant voit ses affectations en un seul appel. |
| ACA-15 | Academic | ✨ | Mon dossier étudiant | Page en lecture seule via `/students/me` (pas de modification par l'étudiant). | nouveau `pages/my-student-record`, `student.service.ts`, route + menu | — | P2 | M | Un étudiant consulte son dossier. Aucun bouton de modification. |
| ACA-16 | Academic | ✨ | Modification d'un dossier par le personnel | `PUT /candidates/{id}` depuis la fiche candidat. | `candidate.service.ts`, `candidate-detail.ts` | X-02 | P2 | M | Le personnel corrige un dossier. Les erreurs 400 sont rattachées aux champs. |
| IDT-03 | Identity | ✨ | Gestion des privilèges | Créer, consulter et supprimer un privilège. | `identity-management.service.ts`, page de gestion des rôles et privilèges | — | P2 | S | CRUD des privilèges opérationnel pour l'admin. |
| BCK-01 | Backend | 📮 | Ticket backend | Remonter B1 à B18 (section 2). | — | — | P1 | S | Ticket créé et lié. |

### Découpage proposé

| Lot | Contenu | Objectif |
|---|---|---|
| **Lot A — Contrats cassés (P0)** | X-01, SCH-01 à SCH-04, ACA-01 à ACA-06, IDT-01 | Plus aucun appel vers une route inexistante ni aucun filtre ignoré. Calendrier, UE, cours, enseignants, étudiants et portail candidat fonctionnels. |
| **Lot B — Robustesse** | X-02, IDT-02, SCH-05, ACA-07, ACA-08, BCK-01 | Erreurs lisibles, avertissements visibles, SAF rattachable à sa faculté. Ticket backend envoyé. |
| **Lot C — Horaires avancés** | SCH-07, SCH-08, SCH-06 | Duplication de semaine et tronc commun dans l'horaire. |
| **Lot D — Curriculum** | ACA-11, ACA-12, ACA-13, ACA-14 | Tronc commun et crédits par UE de bout en bout. |
| **Lot E — Confort** | SCH-09, SCH-10, ACA-09, ACA-10, ACA-15, ACA-16, IDT-03 | Vues complémentaires et nettoyage. |

Points « À confirmer » à lever avant ou pendant le lot A :

- tri `weekStart` ou `week_start` ;
- 500 sur le filtre `week` (B17) ;
- 403 du portail candidat sur l'URL de téléchargement réservée au personnel ;
- extension envoyée avec un point (`.pdf`) ;
- rejet éventuel des champs inconnus dans `PUT /students/{id}`.
