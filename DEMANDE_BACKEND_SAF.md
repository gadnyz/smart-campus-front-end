# Droits du SAF : tâches backend

Constat du 9 novembre 2026, fait uniquement par l'API. Compte de test : `jonathan.kabemba` (`gadnyz@gmail.com`), SAF actif de la Faculté des Sciences Informatiques, profils `PROFESSOR` et `ACADEMIC_SECRETARY` (ajouté à la main).

Objectif : le SAF **consulte et gère sa faculté**, et uniquement elle.

## Ce qui fonctionne déjà

| Module | Droits du SAF | État |
|---|---|---|
| Horaires | `scheduling:timetable` et `timetable-entry` : create, read, update, delete à la portée `faculty` | OK |
| Candidatures | `admission:candidate` : read et update à la portée `faculty` | OK |
| Étudiants | `academic:student` : read et update à la portée `faculty` | OK |
| Faculté, direction, professeurs | Lecture | OK |

## Tâches

### T1 — Académique : créer les privilèges de portée `faculty` (priorité haute)

Ils n'existent pas dans le catalogue (107 privilèges). Les créer, puis les ajouter au rôle `ROLE_SECRETARY_ACADEMIC`.

| Ressource | Aujourd'hui | À créer |
|---|---|---|
| Programmes | `program:read:own` | `academic:program:read:faculty`, `create:faculty`, `update:faculty` |
| UE (avec le programme de cours : `/course-units/{id}/program-levels/...`) | `course-unit:read:promotion` | `academic:course-unit:read:faculty`, `create:faculty`, `update:faculty`, `delete:faculty` |
| Cours | `course:read:promotion` | `academic:course:read:faculty`, `create:faculty`, `update:faculty`, `delete:faculty` |
| Affectations des cours | `course-assignment:read:promotion` | `academic:course-assignment:read:faculty`, `create:faculty`, `update:faculty` |
| Professeurs | `professor:read:faculty` | `academic:professor:create:faculty`, `update:faculty` |
| Grades des professeurs (formulaire professeur) | aucun | Ajouter `academic:professor-grade:read:all` au rôle |

**Critère de fin :** le SAF de la FSI peut créer, modifier et supprimer un cours ou une UE de la FSI, et reçoit un 403 sur ceux d'une autre faculté.

### T2 — Appliquer la portée `faculty` dans les endpoints (priorité haute)

Pour chaque ressource de T1, en lecture comme en écriture :
- les listes ne renvoient que les éléments de la faculté du compte (`users.faculty_id`) ;
- une création, modification ou suppression hors de cette faculté répond 403.

**Constat lié :** avec seulement `program:read:own`, `GET /programs` renvoie les 24 programmes des 8 facultés. La portée n'est donc pas appliquée en lecture. À corriger, sauf si le catalogue des programmes est public par choix.

### T3 — Identité : limiter le SAF à sa faculté (priorité haute)

Le rôle `ROLE_MANAGER_IDENTITY` donne au SAF `identity:user:create:all`, `read:all` et `update:all`. Il peut donc gérer les comptes de **toutes** les facultés.

| Tâche | Détail |
|---|---|
| Créer les privilèges | `identity:user:read:faculty`, `create:faculty`, `update:faculty` |
| Remplacer dans le rôle du SAF | Les privilèges `:all` par `:faculty`. Option : un rôle distinct, par exemple `ROLE_FACULTY_MANAGER_IDENTITY`, si `ROLE_MANAGER_IDENTITY` sert ailleurs. |
| Appliquer | Un compte créé par le SAF reçoit le `faculty_id` du SAF. Le SAF ne voit et ne modifie que les comptes de sa faculté. |
| Profils attribuables | Le SAF ne doit pas pouvoir attribuer `ADMIN` ni `ACADEMIC_SECRETARY` |

### T4 — Nomination SAF : attribuer le profil automatiquement (priorité moyenne)

`POST /faculties/{id}/leadership/assign` avec `role: SAF` ne donne aucun droit. Le profil a dû être ajouté à la main.

| Tâche | Détail |
|---|---|
| À la nomination | Ajouter le profil `ACADEMIC_SECRETARY` et rattacher le compte à la faculté (`faculty_id`) |
| À la révocation | Retirer le profil, sauf si le compte est encore SAF d'une autre faculté |

Le front le fait aujourd'hui en attendant. Il ne le fera plus une fois cette tâche livrée.

### T5 — Corriger les erreurs 500 (priorité basse)

`GET /course-units` et `GET /course-assignments`, sans filtre, renvoient 500 pour tous les comptes, admin compris. Le front ne les appelle pas, il passe par `/program-level/{id}`, `/course/{id}`, `/professor/{id}` et `/me`. Il faut soit les corriger, soit renvoyer une erreur 400 explicite.

## Questions à trancher

1. **Deux SAF actifs à la FSI** (`landry.mbale` et `jonathan.kabemba`). Est-ce autorisé ? Sinon, une nouvelle nomination doit révoquer l'ancienne, ou être refusée.
2. **Création des étudiants** : le privilège `academic:student:create` n'existe pas. Un étudiant naît-il uniquement d'une candidature acceptée ? Le SAF doit-il pouvoir en créer un ?
3. **Création des candidatures** : le SAF a lecture et mise à jour, mais pas `admission:candidate:create:faculty`. Doit-il pouvoir saisir une candidature pour un candidat ?
4. **Droits Identité en lecture** : le SAF lit tous les rôles, profils et privilèges (`:all`). C'est utile pour attribuer un profil. Faut-il le garder ?

## Rôle `ROLE_SECRETARY_ACADEMIC` attendu après T1

```
academic:faculty:read:own
academic:faculty-leadership:read:faculty
academic:level:read:own
academic:semester:read:all
academic:program:read:faculty        academic:program:create:faculty        academic:program:update:faculty
academic:course-unit:read:faculty    academic:course-unit:create:faculty    academic:course-unit:update:faculty    academic:course-unit:delete:faculty
academic:course:read:faculty         academic:course:create:faculty         academic:course:update:faculty         academic:course:delete:faculty
academic:course-assignment:read:faculty  academic:course-assignment:create:faculty  academic:course-assignment:update:faculty
academic:professor:read:faculty      academic:professor:create:faculty      academic:professor:update:faculty
academic:professor-grade:read:all
academic:student:read:faculty        academic:student:update:faculty
```
