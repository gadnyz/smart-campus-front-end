# Planification : tâches backend

Constat du 24 novembre 2026, fait uniquement par l'API, après les tests de l'écran « Horaire ».

## T1 — Des noms dans les messages d'erreur, pas des identifiants (priorité haute)

Les messages renvoyés par l'API citent des UUID et des dates ISO. Exemples :

- « La salle 01a1bc87-a035-7198-b6cf-2f25dc36d4d6 est déjà réservée sur un créneau horaire qui se chevauche. »
- « Le niveau de parcours 01a1bc59-0968-778b-95b6-d3ab33a314cf n'a pas d'emploi du temps pour la semaine du 2026-11-23. »

À faire : dans les `detail` des ProblemDetail et dans les `errors[].message` des lots en 422, écrire le nom de l'objet. Par exemple la salle « 402 A », la promotion « Génie Logiciel L4 », la date « 23 novembre 2026 ». L'identifiant peut rester dans un champ à part (par exemple `errors[].resource_id`) pour le code.

En attendant, le front remplace les identifiants qu'il connaît par leur nom et retire les autres.

**Critère de fin :** aucun message de l'API ne contient d'UUID.

## T2 — Renommer un programme : 409 sans explication (priorité haute)

`PUT /programs/01a1bc59-0810-7478-affe-c9c8931def46` (programme `FSI-TC`) répond **409** « L'opération entre en conflit avec des données existantes. » :

- avec seulement `code`, `name` et `faculty_id` ;
- et avec les mêmes `levels` qu'aujourd'hui.

Seul le nom change : « Sciences Informatiques (tronc commun) » → « Sciences Informatiques ». Aucun autre programme ne porte ce nom.

À faire : permettre de changer le nom d'un programme qui a déjà des horaires et des étudiants, sans recréer ses niveaux. Si le refus est voulu, dire pourquoi dans le message.

## T3 — Nom du programme recopié dans les horaires (priorité moyenne)

`program_name` est recopié dans chaque horaire à sa création, et l'API n'a pas de mise à jour d'en-tête d'horaire. Après un renommage, les anciens horaires garderaient l'ancien nom.

À faire : renvoyer le nom actuel du programme dans les horaires, plutôt qu'une copie figée à la création.

## T4 — Séances partagées (pour information)

Le front applique maintenant cette règle : une séance partagée exige que chaque promotion invitée ait un horaire de la même semaine, non validé.

- Si cet horaire manque, le front le crée en brouillon avant d'enregistrer la séance.
- S'il est validé, le front s'arrête et explique quoi faire.

Si le backend peut créer lui-même l'horaire manquant de la promotion invitée, le front n'aura plus besoin de le faire.

## T5 — Performances mesurées le 24 novembre 2026 (priorité haute)

Médiane sur 5 appels, base de développement, compte admin.

| Appel | Temps | Taille | Constat |
|---|---|---|---|
| `GET /programs/faculty/{id}` (FSI) | **1 587 ms** (max 2 374) | 5 Ko | Très lent pour 6 programmes : probable N+1 sur les niveaux |
| `GET /faculties/{id}/leadership` | 776 ms (max 2 724) | 1 Ko | Lent et irrégulier |
| `GET /course-assignments/course/{id}` | 140 ms seul, **~750 ms** quand 13 partent en même temps | < 1 Ko | Se dégrade sous charge parallèle |
| Autres appels de l'horaire (`/timetables/{id}`, `/timetable-entries/...`, `/rooms`, `/courses/program-level/...`) | 130–310 ms | — | Correct |

À faire :
1. Optimiser `GET /programs/faculty/{id}` et `GET /faculties/{id}/leadership` (chargement des niveaux et des utilisateurs en une requête).
2. Donner en un appel les enseignants des cours d'une promotion. Par exemple `GET /course-assignments?program_level_id=…&academic_year_id=…`, ou le titulaire dans `GET /courses/program-level/{id}`. Aujourd'hui le front fait un appel par cours (13 pour SI L4).
3. Vérifier la taille du pool de connexions : un appel de 140 ms passe à 750 ms dès que 13 partent ensemble.

## T6 — Filtres et tri côté serveur (pour le composant de recherche)

Ce que l'API accepte aujourd'hui (vérifié) : `search` (texte), quelques filtres par identifiant (`faculty_id`, `program_level_id`, `status`) et `sort=champ,asc|desc`. Elle n'accepte pas de filtre par colonne (contient, ne contient pas, est vide, entre deux dates…).

À décider : une syntaxe de filtre générique (par exemple RSQL, `filter=last_name=like=ka*;gender==MALE`) sur les listes paginées, au moins pour les étudiants et les candidats, qui vont grossir.

## Rappel

`GET /timetables?week=...` répond toujours 500. Le front filtre la semaine lui-même.
