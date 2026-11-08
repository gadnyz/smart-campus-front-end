# Données de référence — Smart Campus UNH

> **À mettre à jour à chaque changement de données ou de règles.**
> Dernière mise à jour : **2026-11-08** (premier import FSI 2026-2027).

## 1. Périmètre actuel

- Université Nouveaux Horizons (UNH), Lubumbashi.
- **8 facultés et 24 programmes** (structure fournie le 2026-11-08), dans `database/seed-data/structure/facultes_programmes.csv`. Aucune faculté ni filière ne doit être ajoutée sans décision explicite.
- Seule la **FSI** a des cours, des enseignants et des horaires. Les autres facultés n'ont que leurs programmes.
- **20 candidats de démonstration** (personnes générées), répartis dans les 8 facultés.
- Année académique **2026-2027** (active).
- Seul compte hors FSI : l'administrateur `admin@smart-campus.org`, recréé automatiquement par le backend (`SecurityDatabaseSeeder`) à partir de la configuration `security.admin.default.*`.

## 2. Fichiers sources

Dossier versionné : [`database/seed-data/fsi-2026-2027/`](../database/seed-data/fsi-2026-2027/)

| Fichier | Contenu | Origine | Reçu le |
|---|---|---|---|
| `fsi_grades.csv` | 7 grades (PO, P, PA, CT, CC, Dr, ASS) | Fourni par l'UNH | 2026-11-08 |
| `fsi_enseignants.csv` | 39 enseignants/assistants, grade, rattachement | Fourni par l'UNH | 2026-11-08 |
| `fsi_ue.csv` | 64 UE (code, intitulé, niveau, semestre, crédits, volumes) | Fourni par l'UNH | 2026-11-08 |
| `fsi_ec.csv` | 67 EC (cours) rattachés aux UE | Fourni par l'UNH | 2026-11-08 |
| `fsi_maquette.csv` | 106 lignes parcours × semestre × UE | Fourni par l'UNH | 2026-11-08 |
| `fsi_affectations.csv` | 203 lignes « qui enseigne quoi » 2026-2027 | Fourni par l'UNH | 2026-11-08 |
| `fsi_enseignants_complements.csv` | Sexe, naissance, état civil, nationalité, téléphone | **Généré** par `tools/generate-fsi-complements.mjs` | 2026-11-08 |
| `fsi_blocs.csv` | Bloc de compétences de chaque UE, avec justification | **Déduit** (titre du cours + formation), validé le 2026-11-08 | 2026-11-08 |
| `salles.csv` | 8 salles (6 réelles + 2 provisoires « A POURVOIR », « A MODIFIER ») | Noms et bâtiments fournis par l'UNH ; capacité 60 **provisoire** | 2026-11-08 |
| `horaires/fsi_horaire_2026-11-07_2026-11-14.csv` | 43 séances du 07/11 au 14/11/2026 | Retranscription du PDF « HORAIRE DES COURS » (21 pages, 12 promotions) | 2026-11-08 |
| `fsi_postnoms_releves.csv` | Postnoms et titres de 7 enseignants | Relevés dans le PDF d'horaire, **pas encore appliqués** | 2026-11-08 |
| `../structure/facultes_programmes.csv` | 8 facultés, 24 programmes, niveaux et tronc commun | Liste fournie par l'UNH ; codes proposés et validés | 2026-11-08 |
| `../candidats-2026-2027/candidats.csv` | 20 candidats de démonstration | **Généré** par `tools/generate-candidates.mjs` (déterministe) | 2026-11-08 |

Le fichier `fsi_repartition_2026-2027.json` reçu en même temps n'est pas conservé : il agrège exactement les CSV ci-dessus.

## 3. Correspondance avec le schéma de l'application

| Source | Application | Remarque |
|---|---|---|
| Faculté FSI | `faculties` code `FSI` | |
| Parcours TC, GL, SI, IA + 2 Masters | `programs` `FSI-TC`, `FSI-GL`, `FSI-SI`, `FSI-IA`, `FSI-MIL`, `FSI-MCS` | Masters créés **sans cours** |
| Niveaux | `levels` PREPA, L1–L4, M1, M2 (ordre 1–7) | L1-L2 de `FSI-TC` marqués « tronc commun » ; l'ordre d'un niveau **n'est pas modifiable par l'API** |
| UE | `course_units` (code seul) | Intitulé, semestre et volumes **non stockés** (pas de colonne) ; l'intitulé de l'UE est repris dans la description des cours |
| Maquette | `curriculum_course_units` (UE × niveau de programme) | Une UE commune n'existe qu'une fois, rattachée à plusieurs niveaux de programme |
| Bloc de compétences | `knowledge_skills_bloc` (obligatoire) | Valeurs de `fsi_blocs.csv` |
| EC | `courses` (code = code EC, ex. `LTE1111-EC2`) + `course_unit_courses` | Description : `UE <code> – <intitulé UE>` |
| Enseignant | `professors` + compte `users` (profil PROFESSOR) | La création d'un enseignant crée son compte et **envoie un e-mail** |
| Titulaire / Assistant | `course_assignments` `LEAD_INSTRUCTOR` / `CO_INSTRUCTOR` | Par cours et par année (pas par parcours) |
| Semestre S1…S8 d'une UE | — | **Non géré** (décision 2026-11-08) |
| Volumes CMI / TD / TP | — | **Non gérés** (décision 2026-11-08) |

## 4. Règles appliquées

**Année académique 2026-2027** : du 15/10/2026 au 14/10/2027.
- Semestre 1 (S1, S3, S5, S7) : 15/10/2026 → 28/02/2027.
- Semestre 2 (S2, S4, S6, S8) : 01/03/2027 → 14/10/2027. Pas de périodes d'examens, de rattrapage ou de vacances (l'application ne sait pas les représenter).
- S1-S2 = L1, S3-S4 = L2, S5-S6 = L3, S7-S8 = L4.

**Adresses e-mail** : format **provisoire** `prenom.nom@unhorizon.org` (en attendant les postnoms).
- Domaine `unhorizon.org` **sans « s »**, volontairement inexistant (vérifié le 2026-11-08 : aucun enregistrement DNS).
- Minuscules, sans accents ; espaces et noms composés en tirets (`jean-pierre.bakatuamba`, `jean-octave.kabemba`).
- Nom découpé ainsi : dernier mot = nom, mots précédents = prénom.
- Interdits : `test`, `demo`, `userN`, `john.doe`, `lorem`. Toute collision bloque l'import (pas de numérotation automatique).

**Mots de passe** : générés aléatoirement par le backend à la création du compte, et envoyés par e-mail. Aucun mot de passe n'est écrit dans le code ni dans la documentation ; le mot de passe admin est passé par la variable `SMARTCAMPUS_API_PASSWORD`.

**Grades** : tels que dans `fsi_grades.csv` / `fsi_enseignants.csv`, y compris « Dr » et les 14 grades déduits par règle (« Titre non renseigné → CC », « Colonne Assistant → ASS »).

**Compléments des enseignants** (champs obligatoires absents des sources). Ce sont des **valeurs générées et non réelles, à remplacer par les données RH**. La génération est déterministe : un hash de l'identifiant ENSxxx donne toujours le même résultat.
- Sexe déduit du prénom : 37 hommes, 2 femmes (Odette Sangupamba, Mamie Mujinga). Audrey Kasongo est un homme (confirmé).
- Date de naissance : aléatoire entre 1980 et 1990, ou entre 1992 et 2003 pour les assistants.
- Lieu de naissance : une ville de RDC parmi 20.
- État civil : marié pour PO, P, PA, CC ; célibataire pour ASS, CT, Dr.
- Nationalité : Congolaise.
- Téléphone : `+24381…`, `+24397…` ou `+24398…` suivi de 7 chiffres, tous uniques. ⚠️ Ces numéros peuvent appartenir à de vraies personnes : **ne pas activer les SMS ou WhatsApp** avant de les remplacer.

**Blocs de compétences** (`fsi_blocs.csv`) :

| Bloc | UE | Règle |
|---|---|---|
| FONDAMENTAL | 22 | Informatique, mathématiques et physique de L1-L2, plus le socle L3 commun aux 3 parcours (MOB, TBD, INA, TEL) |
| CROSS_FUNCTIONAL | 15 | Langues, droit, éthique, gestion, économie, méthodologie et recherche, entrepreneuriat, déontologie, séminaire |
| DEVELOPMENT | 27 | Projets, stages, commerce électronique, UE de spécialisation et de L4 |

**Nettoyage** :
- Espaces et normalisation Unicode (NFC) appliqués à toutes les valeurs.
- Majuscules harmonisées (seule la première lettre en majuscule) : « Droit civil et législation sociale », « Algorithmique et méthodes de programmation », « Techniques de base de données », « Circuits logiques ».
- Contrôles bloquants avant import : 30 crédits par parcours et par semestre, EC → UE existante, affectation → enseignant et EC existants, bloc présent, compléments complets, adresses uniques et autorisées.

## 5. Décisions prises (2026-11-08)

1. Reset complet de la base. Seul `admin@smart-campus.org` est conservé ; le second compte ADMIN (`jk@ds.com`) et la salle « 401 » sont supprimés.
2. Pas de capteur de mails local : les e-mails de création de compte partent par le SMTP configuré (vers un domaine inexistant, donc en échec de distribution).
3. Les deux Kabemba (Jean-Octave, Jacques-Octave) sont **deux personnes distinctes**.
4. Les 5 personnes rattachées à Droit ou à Sciences Technologiques (les 2 Kabemba, Danny Kasongo, Yannick Nkulu, Dauphin Kamwanga) sont **rattachées à la FSI** ; leur rattachement d'origine reste dans `fsi_enseignants.csv`.
5. Affectations : **union des parcours** sur le cours unique. Les 203 lignes donnent 137 affectations (66 titulaires, 71 assistants). En conséquence, MRI1361 a 2 titulaires (Bagula, Kasereka), SEI1361 et PSI1363 ont un titulaire (venant de GL et IA), et LPM1471 compte Nathan Mbayo comme assistant.
6. Codes d'UE provisoires et non normalisés importés **tels quels**.
7. Orthographe « Apolinnaire Ndondo » conservée.

**Horaires (2026-11-08)** :

8. Les horaires L1 et L2 « GL / SI / IA » du PDF sont identiques : ils deviennent **un seul horaire** par niveau du tronc commun (`FSI-TC`).
9. Jeudi 12/11, 8h-12h, Système d'exploitation (TC L2) : le PDF donne « A pourvoir » en GL, « 442 » en IA, et rien en SI. La séance est gardée **en salle 442**.
10. Samedi 07/11, Méthodologie (TC L1) : présente seulement sur l'horaire L1 SI, elle est **gardée** pour tout le TC L1.
11. Salles : SALLE JUSTINE, 432, 442 et 402 A dans le **Bâtiment UNH 1** ; ATELIER GENIE ELECT. (laboratoire) et LOCAL 7 dans le **Bâtiment UNH 2**. Capacité 60 provisoire. « A POURVOIR » et « A MODIFIER » sont des salles provisoires (Campus UNH), à remplacer.
12. Une semaine de l'application va du lundi au dimanche : le samedi 07/11 forme un horaire séparé (semaine du 02/11).
13. Tous les horaires sont **validés**, donc visibles par les étudiants. Toutes les séances sont de type « Cours » (LECTURE), avec le titulaire comme enseignant.
14. Séances partagées (une seule réservation de salle et d'enseignant, visible par toutes les promotions concernées) : Télématique et Anglais technique 3 (L3 GL, SI, IA) ; Programmation mobile (L4 GL, SI, IA).
15. La colonne `remarque` des fichiers d'horaire est interne : elle n'est jamais envoyée comme note visible.
16. Grades : on garde ceux de `fsi_enseignants.csv`, même quand le PDF indique un autre titre. Le PDF donne « Ass. » pour Papy Mukanda (CC dans le fichier), « Prof. » pour Lisongomi (CC), Mufind et Masakuna (PA).

**Structure UNH et candidats (2026-11-08)** :

17. Les 8 facultés et leurs programmes sont repris de la liste fournie. Les noms des facultés sont gardés tels quels (par exemple « SIC – Multimédia », « Sciences de Gestion »), sauf la FSI qui garde « Faculté des Sciences Informatiques ».
18. Codes des facultés : `MED`, `SIC`, `ST`, `SAE`, `DROIT`, `FSI`, `SG`, `ESAU`. Codes des programmes : préfixe de la faculté suivi d'un sigle (`ST-GC`, `SG-GBMA`…).
19. FSI : GL, SI et IA **restent en L3-L4**, comme dans la maquette, même si la liste indique L2-L4.
20. Nouveau niveau `PREPA` (« Préparatoire ») en ordre 1 ; les autres sont décalés (L1 = 2 … M2 = 7). Pour la base existante, l'API ne permettant pas de changer l'ordre, la renumérotation a été faite **en SQL** (7 lignes, dans une transaction).
21. Sciences Technologiques : Prépa et L1 sont marqués « tronc commun » dans chacun des 4 programmes de génie, sans programme supplémentaire. Architecture : pas de tronc commun.
22. Les 5 enseignants venus de Droit et de Sciences Technologiques **restent rattachés à la FSI**.
23. Aucun cours ni enseignant pour les nouvelles facultés.
24. 20 candidats **générés**, tous au niveau d'entrée de leur programme (Prépa pour ST et Architecture, L1 sinon), type « nouvelle inscription ». Répartition : FSI 4, MED 3, SG 3, ST 3, SIC 2, SAE 2, DROIT 2, ESAU 1.
    - Statuts visés : 6 validés (ce qui crée 6 étudiants), 3 rejetés avec un motif, 3 brouillons, 8 « en attente ».
    - Aucun document.
    - Adresses `prenom.postnom@unhorizon.org`, téléphones +24381, +24397 ou +24398. Aucun nom porté par un enseignant n'est utilisé (le générateur le vérifie).
    - Écoles génériques (« Lycée de Kolwezi »…).

## 6. Points en attente

| Point | Impact | Action attendue |
|---|---|---|
| Postnoms des enseignants | Adresses provisoires `prenom.nom` | L'UNH fournit les postnoms, puis on décide de la migration des adresses |
| Données RH réelles (naissance, téléphone, état civil, sexe) | Valeurs générées en base | Remplacer `fsi_enseignants_complements.csv` puis mettre à jour les fiches |
| 10 codes d'UE provisoires (STR1361, PAU1361, RTE1471, ART1471, ASR1471, CAR1471, PJV1471, CSI1471, MEC1471, PIA1471) | Codes susceptibles de changer | Codes définitifs à fournir |
| INF404 et INF707 hors norme | — | Confirmer ou renommer |
| Stages SIF1361 et SIF1482 sans enseignant | Aucune affectation | Désigner les encadrants |
| 14 grades déduits par règle, grade « Dr » | — | Confirmation RH |
| Cours des Masters MIL et MCS | Programmes vides | Maquettes à fournir |
| Changement de mot de passe obligatoire à la première connexion | **Non géré par l'application** (`password_changed_at` sert uniquement à invalider les jetons) | Évolution backend et frontend à prévoir |
| Mot de passe SMTP Gmail en clair dans `application-dev.yaml` (backend) | Secret exposé dans l'historique Git | Changer ce mot de passe et le passer en variable d'environnement |
| Postnoms relevés dans le PDF (7 enseignants, `fsi_postnoms_releves.csv`) | Pas encore appliqués aux fiches ni aux adresses | Décider de l'application, au fil des autres postnoms |
| Capacité des salles (60 provisoire) et salles « A POURVOIR » / « A MODIFIER » | Les contrôles de capacité ne sont pas fiables | Capacités réelles, puis réattribution des séances concernées (6 séances TC L2 : 1 « A POURVOIR », 5 « A MODIFIER ») |
| UE programmées hors de leur semestre de maquette : Électronique (S2), RIF1241 et AGT1241 (S4), PAU1361 (S6) en novembre | L'application l'accepte | Vérifier la maquette ou l'horaire |
| 8 candidats visés « en attente » restés en **brouillon** | Le statut PENDING n'est atteint qu'au premier document déposé (`CandidateDocumentService`) ; aucun document n'a été fourni | Décider : document de démonstration, ou les laisser en brouillon |
| L'API ne permet pas de changer l'ordre d'un niveau (`UpdateLevelRequest` sans `order`) | Toute réorganisation des niveaux passe par SQL | Évolution backend si besoin |
| Création de candidats limitée en débit (429), quelques créations par minute | Import des candidats lent (~20 min pour 20) ; le seeder attend et réessaie | Aucune (protection normale de l'endpoint public) |
| **Bug backend** : `GET /api/v1/timetables?week=…` renvoie 500 (« could not determine data type of parameter ») | Le filtre par semaine est inutilisable via l'API ; le seeder filtre côté client | Corriger la requête JPQL (paramètre date nullable) côté backend |

## 7. Procédure de réinitialisation

Prérequis : les conteneurs Docker du backend tournent (`smart-campus-backend`, `-postgres`, `-minio`, `-redis`, `-rabbitmq`) et l'API répond sur `http://localhost:8085`.

```powershell
# 1. Mot de passe admin (jamais écrit dans un fichier)
$env:SMARTCAMPUS_API_PASSWORD = '<mot de passe admin>'

# 2. Simulation : affiche chaque étape, ne modifie rien
npm run db:reset -- --dry-run --seed

# 3. Réinitialisation + import FSI, en une commande
npm run db:reset -- --yes --seed
```

Ce que fait `npm run db:reset -- --yes --seed` ([tools/reset-db.mjs](../tools/reset-db.mjs)) :
1. **Sauvegarde** dans `backups/<date_heure>/` : dump PostgreSQL et données MinIO. Le dossier est ignoré par Git. Arrêt si le dump est vide.
2. Arrêt du backend, puis `DROP/CREATE DATABASE`, vidage de tous les buckets MinIO et de Redis.
3. Redémarrage du backend : Liquibase recrée le schéma, `SecurityDatabaseSeeder` recrée les privilèges, rôles, profils et l'admin.
4. Contrôle : connexion de l'admin, qui doit être le seul utilisateur.
5. Import FSI via [tools/seed-fsi.mjs](../tools/seed-fsi.mjs), avec contrôles des crédits et des comptages.

`--seed` enchaîne `seed-fsi`, `seed-structure` et `seed-fsi-timetables`. Ajouter `--candidats` pour importer aussi les candidats ; cela envoie environ 29 e-mails : 20 à la création, puis 9 à la validation ou au rejet.

Structure UNH et candidats, séparément :

```powershell
npm run seed:structure -- --check ; npm run seed:structure   # niveaux, facultés, programmes
npm run seed:candidats -- --check ; npm run seed:candidats   # 20 candidats, puis validations et rejets
node tools/generate-candidates.mjs                           # régénère candidats.csv (même résultat à chaque fois)
```

Les salles et les horaires seuls :

```powershell
npm run seed:fsi:horaires -- --check   # simulation
npm run seed:fsi:horaires              # salles, horaires, séances, puis validation (DRAFT -> SUBMITTED -> VALIDATED)
```

[tools/seed-fsi-timetables.mjs](../tools/seed-fsi-timetables.mjs) lit `salles.csv` et **tous** les fichiers de `horaires/`. Il est idempotent : une séance est retrouvée par date, heure de début et cours. Pour ajouter une semaine, il suffit de déposer un nouveau CSV dans `horaires/`. Un horaire déjà validé n'est jamais modifié : le script s'arrête avec un message si une séance nouvelle le concerne. L'option `--draft` crée les horaires sans les valider.

Commandes séparées :
- `npm run seed:fsi:check` : simulation de l'import, sans aucune écriture.
- `npm run seed:fsi` : import seul. Il est **idempotent** : relancé, il retrouve les objets existants et ne crée aucun doublon.
- `node tools/generate-fsi-complements.mjs` : régénère les compléments (même résultat à chaque fois).

Restaurer une sauvegarde : `docker cp backups/<dossier>/dev.dump smart-campus-postgres:/tmp/` puis `docker exec smart-campus-postgres pg_restore -U <utilisateur> -d dev --clean --if-exists /tmp/dev.dump`. Le backend doit être arrêté pendant la restauration.

## 8. Résultat attendu après import (contrôlé le 2026-11-08)

| Objet | Nombre |
|---|---|
| Faculté | 1 |
| Programmes / niveaux de programme | 6 / 12 |
| Niveaux | 6 |
| Année académique (active) / semestres | 1 / 2 |
| Grades | 7 |
| UE / lignes de maquette | 64 / 106 |
| Cours (EC) | 67 |
| Enseignants / comptes utilisateurs | 39 / 40 (avec l'admin) |
| Affectations (titulaires / assistants) | 137 (66 / 71) |
| Crédits par niveau de programme (TC L1, TC L2, GL/SI/IA L3 et L4) | 60 chacun (2 × 30) |
| Salles | 8 |
| Horaires validés (semaines du 02/11 et du 09/11) | 13 (5 + 8) |
| Séances | 43 (dont 12 partagées) |

Séances visibles par promotion, semaine du 09/11 : TC L1 11, TC L2 10, GL L3 6, SI L3 6, IA L3 11, GL L4 5, SI L4 8, IA L4 5. Semaine du 02/11 (samedi 07/11) : TC L1 1, TC L2 1, GL/SI/IA L3 1 chacun.

Historique :
- 2026-11-08 : sauvegarde `backups/2026-11-08_1933/`, reset complet, premier import FSI 2026-2027 (330 objets créés), relance sans création de doublon.
- 2026-11-08 : import des salles et de l'horaire du 07/11 au 14/11/2026 (8 salles, 13 horaires validés, 43 séances), relance sans doublon, calendrier vérifié dans l'interface.
