# Droits à corriger côté backend — SAF et admins de module

Constat fait le 5 novembre 2026 en lisant l'API (`/privileges`, `/roles`, `/profiles`, `/users`), sans accès au code backend.

## 1. Le SAF n'a pas de portée faculté sur l'Académique

Sur les facultés, les UE, les cours et les professeurs, le profil `ACADEMIC_SECRETARY` a exactement les mêmes droits qu'un étudiant :

| Ressource | SAF aujourd'hui | Étudiant aujourd'hui |
|---|---|---|
| Faculté | `academic:faculty:read:own` | `academic:faculty:read:own` |
| Programmes | `academic:program:read:own` | `academic:program:read:own` |
| UE | `academic:course-unit:read:promotion` | `academic:course-unit:read:promotion` |
| Cours | `academic:course:read:promotion` | `academic:course:read:promotion` |
| Professeurs | `academic:professor:read:faculty` | `academic:professor:read:faculty` |
| Affectations | `academic:course-assignment:read:promotion` | `academic:course-assignment:read:promotion` |

Le catalogue des privilèges ne contient même pas de privilège de portée `faculty` pour les facultés, les UE, les cours et les programmes. Il ne contient aucune écriture de portée `faculty` dans l'Académique, sauf pour les étudiants.

### Privilèges à créer et à ajouter à `ROLE_SECRETARY_ACADEMIC`

Le SAF doit consulter et gérer sa faculté.

| Ressource | Privilèges |
|---|---|
| Programmes | `academic:program:read:faculty`, `academic:program:create:faculty`, `academic:program:update:faculty` |
| UE | `academic:course-unit:read:faculty`, `academic:course-unit:create:faculty`, `academic:course-unit:update:faculty`, `academic:course-unit:delete:faculty` |
| Cours | `academic:course:read:faculty`, `academic:course:create:faculty`, `academic:course:update:faculty`, `academic:course:delete:faculty` |
| Professeurs | `academic:professor:create:faculty`, `academic:professor:update:faculty` (`read:faculty` existe déjà) |
| Affectations | `academic:course-assignment:read:faculty`, `academic:course-assignment:create:faculty`, `academic:course-assignment:update:faculty` |

Chaque endpoint concerné doit appliquer la portée `faculty` : n'autoriser que les ressources de la faculté du compte (`users.faculty_id`), en lecture comme en écriture. La documentation de l'API le promet pour les listes (« Staff only see … their own scope »), mais pas pour les écritures.

### Droits Identité trop larges

Le SAF détient `identity:user:create:all` et `identity:user:update:all`. Il peut donc créer et modifier les utilisateurs de toutes les facultés. Ces droits devraient être limités à sa faculté (`:faculty`).

## 2. Nommer un SAF ne lui donne aucun droit

`POST /faculties/{id}/leadership/assign` avec `role: SAF` ne change ni le profil ni les autorités du compte.

Testé avec le compte `saf.test.11051457@smart-campus.org` (profil PROFESSOR) dans la Faculté des Sciences Informatiques : ses autorités sont identiques avant et après la nomination.

En attendant une décision côté serveur, le front attribue lui-même le profil `ACADEMIC_SECRETARY` à la nomination et le retire à la révocation. Il rattache aussi le compte à la faculté (`faculty_id`).

À décider côté serveur : lier directement la fonction SAF au profil, pour que l'appel du front devienne inutile.

## 3. Aucun profil d'admin de module

Les rôles `ROLE_ADMIN_ACADEMIC`, `ROLE_ADMIN_ADMISSION` et `ROLE_ADMIN_SCHEDULING` existent, mais seulement à l'intérieur du profil `ADMIN`. On ne peut donc pas nommer quelqu'un admin d'un seul module.

À créer :

| Profil | Rôles |
|---|---|
| `ADMIN_ACADEMIC` | `ROLE_ADMIN_ACADEMIC`, `ROLE_BASIC_IDENTITY` |
| `ADMIN_ADMISSION` | `ROLE_ADMIN_ADMISSION`, `ROLE_BASIC_IDENTITY` |
| `ADMIN_SCHEDULING` | `ROLE_ADMIN_SCHEDULING`, `ROLE_BASIC_IDENTITY` |

Le front affiche déjà les bons menus pour chacun de ces rôles pris seul :

| Rôle seul | Menu | Paramètres |
|---|---|---|
| `ROLE_ADMIN_ACADEMIC` | Facultés, UE, Cours, Professeurs, Étudiants | Académique |
| `ROLE_ADMIN_ADMISSION` | Candidatures | Admission |
| `ROLE_ADMIN_SCHEDULING` | Horaires | Planification |

## 4. Étudiants et professeurs : lecture des professeurs

Le front ouvre maintenant les écrans de gestion à la lecture de portée `faculty` ou `all`. Les étudiants et les professeurs ont `academic:professor:read:faculty` : ils voient donc la liste des professeurs de leur faculté, en lecture seule.

Si ce n'est pas voulu, ramenez leur droit à `academic:professor:read:promotion`.

## Règle appliquée par le front

| Règle | Comportement |
|---|---|
| Ouvrir un écran de gestion | Écriture (create, update, delete) à une portée promotion, program, faculty ou all, ou lecture à la portée faculty ou all |
| Afficher les actions | Écriture correspondante, hors portée `own` |
| Portée `all` | L'utilisateur choisit d'abord une faculté, gardée d'un écran à l'autre |
| Portée plus étroite | L'utilisateur travaille directement dans la faculté de son compte, sans filtre de faculté |
