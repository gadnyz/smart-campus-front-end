# Documentation Smart Campus

**Version 1.0.0 — 26 novembre 2026**

Smart Campus est l'application de gestion universitaire de l'Université Nouveaux Horizons (UNH). Elle couvre les admissions, la structure académique, la planification des cours, ainsi que les comptes et les droits des utilisateurs.

Cette documentation comporte deux parties.

| Partie | Pour qui | Contenu |
|---|---|---|
| [Guide utilisateur](guide-utilisateur/prise-en-main.md) | Candidats, étudiants, professeurs, secrétaires académiques, administrateurs | Utiliser l'application, écran par écran |
| [Développement](developpement/installation.md) | Développeurs front-end | Installer le projet, comprendre son architecture, créer et brancher un module |

## Guide utilisateur

Chaque page indique les profils concernés. Commencez par la prise en main, puis lisez les pages qui correspondent à votre profil.

| Page | Profils concernés |
|---|---|
| [Prise en main](guide-utilisateur/prise-en-main.md) | Tous |
| [Parcours du candidat et de l'étudiant](guide-utilisateur/parcours-candidat-etudiant.md) | Candidat, étudiant |
| [Candidatures et étudiants](guide-utilisateur/candidatures-etudiants.md) | Administrateur, secrétaire académique |
| [Gestion académique](guide-utilisateur/gestion-academique.md) | Administrateur |
| [Professeurs](guide-utilisateur/professeurs.md) | Administrateur, secrétaire académique, professeur |
| [Emplois du temps](guide-utilisateur/emplois-du-temps.md) | Administrateur, secrétaire académique, professeur, étudiant |
| [Utilisateurs, profils et droits](guide-utilisateur/utilisateurs-droits.md) | Administrateur, secrétaire académique |
| [Configuration](guide-utilisateur/configuration.md) | Administrateur |

## Développement

Pour un nouveau développeur, l'ordre suivant est recommandé :

1. [Installation](developpement/installation.md) : installer le projet et le lancer.
2. [Technologies](developpement/technologies.md) : identifier les bibliothèques et leurs versions.
3. [Architecture](developpement/architecture.md) : comprendre l'organisation du code.
4. [Démarrage rapide : créer un module](developpement/creer-un-module.md) : construire un module complet, de la déclaration aux tests.
5. [Brancher un module](developpement/brancher-un-module.md) : routes, menu, droits et checklist.
6. [Communication avec le backend](developpement/communication-backend.md) : appeler l'API et gérer les erreurs.

### Modules de l'application

Chaque module est déclaré dans un fichier `*.feature.ts` et enregistré dans `src/app/core/modules/app-feature.registry.ts`.

| Module | Rôle | Route principale | Paramètres | Déclaration |
|---|---|---|---|---|
| Identité | Profil et préférences de l'utilisateur connecté ; gestion des utilisateurs, profils métier, rôles et privilèges | `/identity` | `/settings/identity` | `features/identity/identity.feature.ts` |
| Académique | Facultés, unités d'enseignement, cours, professeurs, étudiants | `/academic` | `/settings/academic` | `features/academic/academic.feature.ts` |
| Planification | Horaires hebdomadaires et salles | `/scheduling` | `/settings/scheduling` | `features/scheduling/scheduling.feature.ts` |
| Admission | Candidatures, dossier du candidat | `/admission` | `/settings/admission` | `features/admission/admission.feature.ts` |
| Système | Paramètres généraux de l'application ; n'apparaît que dans les Paramètres | aucune | `/settings/system` | `core/settings/core.feature.ts` |

Deux points d'entrée existent en dehors de ces modules : le formulaire public de pré-inscription `/apply` (`src/app.routes.ts`), et les pages de connexion sous `/auth` (`src/app/core/auth/auth.routes.ts`).

## Glossaire

Ces termes sont employés dans l'interface et dans toute la documentation. Chaque terme désigne toujours la même notion.

| Terme | Définition |
|---|---|
| Faculté | Composante de l'université. |
| Programme | Formation proposée par une faculté. |
| Niveau | Année d'études : préparatoire, licence ou master. |
| Promotion | Un programme à un niveau donné, par exemple la licence 1 d'un programme. |
| Tronc commun | Niveau partagé par plusieurs programmes : les mêmes enseignements sont suivis par plusieurs promotions. |
| Unité d'enseignement (UE) | Regroupement de cours, inscrit au programme d'une ou de plusieurs promotions. |
| Cours | Enseignement rattaché à une UE. |
| Horaire | Emploi du temps d'une promotion pour une semaine. Il est d'abord en brouillon, puis soumis, puis validé. |
| Séance | Créneau d'un horaire : un cours, une salle, un enseignant, une date et des heures. |
| Séance partagée | Séance suivie par plusieurs promotions en même temps, dans la même salle. |
| Salle | Lieu d'une séance : standard, en ligne, bureau ou laboratoire. |
| Candidature | Demande d'inscription déposée par un candidat. |
| SAF | Secrétaire académique d'une faculté. |
| Profil métier | Ensemble de droits attribué à un utilisateur : administrateur, secrétaire académique, professeur, étudiant ou candidat. |
| Autorité | Pour les développeurs : droit élémentaire reçu de l'API, de la forme `module:ressource:action:portée`. |
| Portée | Pour les développeurs : dernier segment d'une autorité (`own`, `promotion`, `program`, `faculty` ou `all`). |
