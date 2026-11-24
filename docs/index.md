# Documentation du front-end Smart Campus

Cette documentation s'adresse aux développeurs qui rejoignent l'équipe front-end de `unh-smartcampus`. Elle présente l'application, son architecture et la procédure pour ajouter un module. À la fin de votre lecture, vous pourrez installer le projet, comprendre son organisation et brancher un nouveau module de façon autonome.

## Objectif de l'application

Smart Campus est l'application de gestion universitaire de l'Université Nouveaux Horizons (UNH). Elle couvre les admissions, la structure académique, la planification des cours, ainsi que les comptes et les droits des utilisateurs.

Le front-end est une application Angular. Il affiche les données et transmet les actions à une API REST, fournie par un projet backend séparé. En développement, cette API répond sur `http://localhost:8085`. Le backend n'est pas documenté ici. Seule la façon dont le front-end communique avec lui est décrite, dans [Communication avec le backend](developpement/communication-backend.md).

## Modules fonctionnels

Chaque module est déclaré dans un fichier `*.feature.ts` et enregistré dans `src/app/core/modules/app-feature.registry.ts`. Le tableau ci-dessous reprend ces déclarations.

| Module | Rôle | Route principale | Paramètres | Déclaration |
|---|---|---|---|---|
| Identité | Profil et préférences de l'utilisateur connecté ; gestion des utilisateurs, profils métier, rôles et privilèges | `/identity` | `/settings/identity` | `features/identity/identity.feature.ts` |
| Académique | Facultés, unités d'enseignement, cours, professeurs, étudiants | `/academic` | `/settings/academic` | `features/academic/academic.feature.ts` |
| Planification | Horaires hebdomadaires et salles | `/scheduling` | `/settings/scheduling` | `features/scheduling/scheduling.feature.ts` |
| Admission | Candidatures, dossier du candidat | `/admission` | `/settings/admission` | `features/admission/admission.feature.ts` |
| Système | Paramètres généraux de l'application ; n'apparaît que dans les Paramètres | aucune | `/settings/system` | `core/settings/core.feature.ts` |

Deux points d'entrée existent en dehors de ces modules :

- `/apply` : formulaire public de pré-inscription, accessible sans connexion (`src/app.routes.ts`).
- `/auth` : connexion, mot de passe oublié et réinitialisation (`src/app/core/auth/auth.routes.ts`).

La page `/` affiche le tableau de bord. Chaque module peut y ajouter des widgets (voir [Brancher un module](developpement/brancher-un-module.md)).

## Glossaire

Les termes suivants sont employés dans le code, dans l'interface et dans cette documentation. Chaque terme désigne toujours la même notion.

| Terme | Définition |
|---|---|
| Faculté | Composante de l'université. |
| Programme | Formation proposée par une faculté. |
| Niveau | Année d'études d'un programme. |
| Promotion | Un programme à un niveau donné. L'API l'identifie par `program_level_id`. |
| Tronc commun | Niveau partagé par plusieurs programmes. Une unité d'enseignement en tronc commun figure au curriculum de plusieurs promotions. |
| Unité d'enseignement (UE) | Regroupement de cours, rattaché au curriculum d'une ou de plusieurs promotions. |
| Cours | Enseignement rattaché à une UE. Le backend l'appelle `course`. |
| Curriculum | Liste des UE d'une promotion. |
| Horaire | Emploi du temps d'une promotion pour une semaine. Il suit les statuts brouillon, soumis puis validé (`DRAFT`, `SUBMITTED`, `VALIDATED`). |
| Séance | Créneau d'un horaire : un cours, une salle, un enseignant, une date et des heures. Une séance peut être partagée entre plusieurs promotions. |
| Salle | Lieu d'une séance. Son type est standard, en ligne, bureau ou laboratoire. |
| Candidature | Demande d'inscription déposée par un candidat, depuis `/apply` ou depuis son espace. |
| SAF | Secrétaire académique d'une faculté. Le rôle est attribué dans la fiche de la faculté ; les droits viennent du profil métier associé. |
| Profil métier | Ensemble de rôles attribué à un utilisateur. La liste des profils vient de l'API. |
| Autorité | Droit élémentaire reçu de l'API, de la forme `module:ressource:action:portée`, par exemple `scheduling:room:update:all`. |
| Portée | Dernier segment d'une autorité : `own`, `promotion`, `program`, `faculty` ou `all`. Elle indique l'étendue du droit. |

## Parcours de lecture conseillé

Pour un nouvel arrivant, l'ordre suivant est recommandé :

1. [Installation](installation.md) : installer le projet et le lancer.
2. [Technologies](technologies.md) : identifier les bibliothèques et leurs versions.
3. [Architecture](developpement/architecture.md) : comprendre l'organisation du code.
4. [Communication avec le backend](developpement/communication-backend.md) : appeler l'API et gérer les erreurs.
5. [Créer un module](developpement/creer-un-module.md) : tutoriel complet, à partir d'un module existant.
6. [Brancher un module](developpement/brancher-un-module.md) : routes, menu, droits et checklist.
