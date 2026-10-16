# Analyse Scheduling V2 — UNH SmartCampus

> Analyse fonctionnelle, technique et design du module **Planification › Horaires**.
> Réalisée le 16/10/2026 sur la branche `feature/Scheduling-timetable` (HEAD `ecabc07`), en lecture seule.
> Sources : code `src/app/features/scheduling/`, documents `conventions_architecturales.md`, `DESIGN.md`, `AGENTS.md`, `AUDIT_ANGULAR.md`, spécifications OpenAPI **Scheduling** et **Identity** récupérées sur `http://localhost:8085` (authentification Basic, droit `identity:api:manage`), build de production et tests existants.

---

## 1. Résumé

**Le socle est solide** : création et édition d'un horaire hebdomadaire, sessions saisies en fenêtre et enregistrées par différence, circuit de validation complet (brouillon → soumis → validé → rouvert), vue de gestion par promotion, vues personnelles étudiant et professeur, affichage responsive. FullCalendar 6.1 reste hors du bundle initial (chunk paresseux de 284 kB ; bundle initial : 947 kB brut, 235 kB transférés). 16 fichiers de tests, 141 cas.

**Quatre faiblesses structurelles** conditionnent la suite :
1. **Trois contournements côté front** compensent des manques du backend : le filtre `week` de `GET /timetables` renvoie 500, aucun endpoint « mes séances » n'existe pour l'enseignant, et le grade n'est pas renvoyé avec les séances. Ces contournements fonctionnent, mais reposent sur des droits trop larges (`timetable-entry:read:all` pour l'enseignant) ou sur des listes complètes.
2. **Le cloisonnement par faculté du SAF n'est qu'un filtre d'affichage.** Deux services en donnent de plus deux définitions différentes : `FacultyScopeService` raisonne par permission, `TimetableScopeService` par profil.
3. **Plusieurs endpoints Scheduling ne sont pas exploités** : duplication d'horaire, séances d'une salle, plage de dates, détail d'une séance, suppression d'un horaire.
4. **L'impression n'existe pas vraiment** : deux règles `@media print` partielles, sans en-tête ni logo ; la barre latérale et la barre du haut s'impriment.

**Recommandations, par ordre :**
- **Lot 1 (faible)** : bouton Retour vers l'écran précédent, sélecteur de vue en `p-select` avec barre d'outils maison, plage horaire 07:00–20:00.
- **Lot 2 (faible)** : refonte de la liste des horaires (regroupement par faculté, filtre en haut à droite, colonnes demandées).
- **Lot 3 (moyen)** : composant d'impression dédié, au format de « Horaire Faculté », en A4 paysage.
- **Lot 4 (moyen)** : widget « Mon horaire » paresseux dans une nouvelle colonne de droite du dashboard.
- **Lot 5** : duplication, vue salle, suppression d'horaire.

En parallèle, il faut porter au backend quatre corrections et ajouts, faute de quoi les points 1 et 2 restent des contournements : le bug du filtre `week`, `GET /timetable-entries/me/week` pour l'enseignant, la portée `:faculty`, le conflit enseignant.

**Point bloquant pour la partie 2** : **aucun fichier « Horaire Faculté » n'existe dans le dépôt**. J'ai cherché par nom et par contenu, dans tout le projet hors `node_modules`. L'analyse s'appuie sur la capture fournie (grille hebdomadaire, en-tête bleu, une ligne par créneau, cours / enseignant / salle en couleurs) ; voir la question Q1.

---

## 2. État des lieux du module Scheduling

### 2.1 Architecture

| Élément | Fichier | Rôle |
|---|---|---|
| Descripteur | [scheduling.feature.ts](src/app/features/scheduling/scheduling.feature.ts) | Menu « Horaires » (gestion, l. 26-34) et « Mon horaire » (lecture personnelle, l. 35-45), onglet Paramètres › Salles |
| Routes | [timetable/routes.ts](src/app/features/scheduling/timetable/routes.ts) | `timetable` (calendrier de gestion), `timetable/pending` (liste), `timetable/new`, `timetable/:id/edit` (garde de sortie), `my-timetable` |
| Permissions | [permissions/permission.model.ts](src/app/features/scheduling/permissions/permission.model.ts) | 13 clés `scheduling:*` |
| Services HTTP | [timetable.service.ts](src/app/features/scheduling/timetable/services/timetable.service.ts), [timetable-entry.service.ts](src/app/features/scheduling/timetable/services/timetable-entry.service.ts), [room.service.ts](src/app/features/scheduling/services/room.service.ts) | Accès à l'API |
| Services transverses | [timetable-scope.service.ts](src/app/features/scheduling/timetable/services/timetable-scope.service.ts), [professor-label.service.ts](src/app/features/scheduling/timetable/services/professor-label.service.ts) | Portée SAF et profil ; libellé « Grade Prénom Nom » |
| Pages | `pages/timetable` (calendrier), `pages/timetable-pending` (liste), `pages/timetable-form` (création et édition), `pages/my-timetable` (Mon horaire) | — |
| Composants | `components/timetable-calendar` (enveloppe FullCalendar), `components/timetable-session-dialog` (détail d'une séance) | — |
| Utilitaires purs | `utils/timetable-session.ts` (lignes ↔ séances, différence à enregistrer, chevauchements), `utils/timetable-events.ts`, `utils/timetable-time.ts`, `utils/timetable-error.ts`, `styles/_stacked-table.scss` | Testés unitairement |

### 2.2 Bibliothèque de calendrier

- `@fullcalendar/angular` 6.1.21 avec les plugins `daygrid`, `timegrid`, `list` et `interaction`. Le plugin `interaction` est chargé, mais aucun glisser-déposer n'est activé.
- La configuration est dans [timetable-calendar.ts](src/app/features/scheduling/timetable/components/timetable-calendar/timetable-calendar.ts) :
  - mode compact sous 640 px (`COMPACT_QUERY`, l. 17), avec une barre d'outils réduite et les vues en pied de calendrier (`responsiveOptions`, l. 31-43) ;
  - vue initiale `listWeek` sur téléphone et `timeGridWeek` ailleurs (l. 72) ;
  - plage **00:00–24:00** (l. 78-79), qui produit beaucoup de grille vide ;
  - titre réduit au cours et heure masquée dans les blocs, professeur ajouté dans la vue liste (l. 82-95) ;
  - couleur par type de séance ([timetable-calendar.scss:42-64](src/app/features/scheduling/timetable/components/timetable-calendar/timetable-calendar.scss#L42-L64)).
- Bundle : FullCalendar occupe un chunk paresseux de **284 kB**, référencé seulement par les chunks des pages du module. Il n'est pas dans le bundle initial.

### 2.3 Écrans

| Écran | Route | Profil | Données |
|---|---|---|---|
| Calendrier de gestion | `/scheduling/timetable` | Admin, SAF | Horaires VALIDÉS de la promotion choisie, une semaine après l'autre (contournement du 500, [timetable.ts:171](src/app/features/scheduling/timetable/pages/timetable/timetable.ts#L171)) |
| Liste des horaires | `/scheduling/timetable/pending` | Admin, SAF | `GET /timetables?status=…` paginé côté serveur, filtre Brouillons / Soumis / Validés |
| Création et édition | `/scheduling/timetable/new`, `/:id/edit` | Admin, SAF | Horaire créé automatiquement, sessions en fenêtre, actions de statut dans le sous-titre |
| Mon horaire | `/scheduling/my-timetable` | Étudiant, enseignant | Étudiant : `/timetables/me/week`. Enseignant : affectations → séances → horaires validés ([my-timetable.ts:122-180](src/app/features/scheduling/timetable/pages/my-timetable/my-timetable.ts#L122-L180)) |
| Salles | `/settings/scheduling/rooms` | Admin | CRUD des salles |

### 2.4 Tests existants

16 fichiers `.spec.ts` et 141 cas `it(...)` dans le module. Ils couvrent : les utilitaires purs (temps, sessions, erreurs, événements), les services (`HttpTestingController`), le scope, les libellés, les pages (formulaire complet avec horloge Jasmine, liste, calendrier, Mon horaire) et le composant calendrier. Il n'existe pas de test e2e versionné : les tests responsive ont été faits par un script Playwright hors dépôt.

### 2.5 Points de vigilance relevés dans le code actuel

| # | Constat | Emplacement |
|---|---|---|
| V1 | `TimetableScopeService` (portée par **profil** `ACADEMIC_SECRETARY`) duplique `core/auth/FacultyScopeService` (portée par **permission** `academic:faculty:read:own`). Ce sont deux définitions du même concept : un utilisateur peut être cloisonné dans Académique et pas dans Scheduling, ou l'inverse. | [timetable-scope.service.ts:29-48](src/app/features/scheduling/timetable/services/timetable-scope.service.ts#L29-L48) contre [faculty-scope.service.ts](src/app/core/auth/services/faculty-scope.service.ts) |
| V2 | Permission incohérente : l'action « Horaires en attente » demande `timetable:read:all` ([timetable.ts:86](src/app/features/scheduling/timetable/pages/timetable/timetable.ts#L86)), alors que sa route demande la création ou la modification ([routes.ts:18-28](src/app/features/scheduling/timetable/routes.ts#L18-L28)). C'est contraire à l'exigence « permissions identiques entre route, menu et composants ». | — |
| V3 | Pagination plafonnée : 100 horaires validés au plus par promotion ([timetable.ts:25](src/app/features/scheduling/timetable/pages/timetable/timetable.ts#L25)) et 100 pour la recherche après un 409 ([timetable-form.ts:799](src/app/features/scheduling/timetable/pages/timetable-form/timetable-form.ts#L799)). C'est la conséquence directe du bug `week` du backend. | — |
| V4 | L'annuaire complet des professeurs est chargé pour afficher les grades. | [professor-label.service.ts:21](src/app/features/scheduling/timetable/services/professor-label.service.ts#L21) |
| V5 | La vue enseignant utilise `timetable-entry:read:all`, un droit trop large déjà signalé : sans lui, la page ne fonctionne plus. | [my-timetable.ts:122](src/app/features/scheduling/timetable/pages/my-timetable/my-timetable.ts#L122) |
| V6 | Le dashboard n'est pas `OnPush` et ne gère que des widgets chargés immédiatement (M12 de l'audit). | [dashboard.ts:6-45](src/app/pages/dashboard/dashboard.ts) |

---

## 3. Partie 1 — Analyse fonctionnelle

Légende **Backend** : ✅ existe dans l'API · 🟡 partiel · ❌ à créer.
Effort : faible (≤ 1 j) · moyen (2-5 j) · élevé (> 5 j).

### 3.1 Améliorations de l'existant

| # | Amélioration | Valeur métier | Backend | Effort | Priorité |
|---|---|---|---|---|---|
| A1 | Corriger le **500 du filtre `week`** (`TimetableRepository.findAllByFilters`, `CAST(:weekStart AS date)`) puis retirer le contournement et le plafond de 100 | Fiabilité ; supprime une pagination plafonnée | ❌ correctif | Faible | **MVP** |
| A2 | **Conflit enseignant** : aujourd'hui seule l'affectation est contrôlée, donc un professeur à deux affectations peut être placé deux fois au même créneau | Évite des doubles réservations réelles | ❌ | Moyen | **MVP** |
| A3 | Endpoint **`GET /timetable-entries/me/week`** pour l'enseignant, puis retrait de `read:all` de son rôle | Sécurité (fuite de brouillons), performance | ❌ | Moyen | **MVP** |
| A4 | **Une seule définition de la portée faculté** (fusion de V1) et portée `:faculty` côté serveur | Cohérence entre modules, vraie sécurité SAF | 🟡 (`faculty_id` existe, pas la portée) | Moyen | **MVP** (front) / V2 (serveur) |
| A5 | **Grade dans les réponses de séances** (jointure sur le grade) et suppression de l'annuaire complet | Performance | ❌ | Faible | V2 |
| A6 | Liste des horaires : regroupement, colonne Faculté, filtre en haut à droite (voir 4.3) | Lisibilité pour l'admin et le SAF | ✅ (tri multi-colonnes) | Faible | **MVP** |
| A7 | Bouton **Retour** vers l'écran précédent (voir 4.5) | Ergonomie | — | Faible | **MVP** |
| A8 | Permission de l'action « Horaires en attente » alignée sur la route (V2) | Conformité à l'audit | — | Faible | **MVP** |
| A9 | Plage horaire **07:00–20:00** au lieu de 00:00–24:00 (calendrier l. 78-79), éventuellement réglable | Lisibilité, moins de défilement | — | Faible | **MVP** |
| A10 | **Accessibilité du calendrier** : les séances ne sont pas atteignables au clavier (seul le clic est géré, l. 115). Ajouter `tabindex`, la touche Entrée et un `aria-label` via `eventDidMount` | Accessibilité | — | Faible | V2 |
| A11 | **Mode sombre** : `--p-primary-100` et `--p-primary-700` sont figés dans l'en-tête du jour ([scss:9-10](src/app/features/scheduling/timetable/components/timetable-calendar/timetable-calendar.scss#L9-L10)) | Contraste en sombre | — | Faible | V2 |
| A12 | **Suppression d'un horaire** brouillon depuis l'interface (`DELETE /timetables/{id}` n'est appelé que pour les brouillons orphelins) | Nettoyage | ✅ (attention : les séances ne sont pas supprimées en cascade côté serveur, constat C1 de l'audit backend) | Faible | V2 |
| A13 | **Lien de visioconférence** : `room_link` est renvoyé à l'étudiant mais jamais affiché | Séances en ligne utilisables | ✅ | Faible | **MVP** |

### 3.2 Fonctionnalités manquantes

| # | Fonctionnalité | Valeur métier | Backend | Effort | Priorité |
|---|---|---|---|---|---|
| F1 | **Détection des conflits** à la création et au déplacement | Indispensable pour un planning fiable | 🟡 salle, promotion et affectation ✅ (422/409, erreurs par séance déjà affichées) ; enseignant ❌ ; pré-vérification sans écriture ❌ | Moyen | **MVP** (enseignant) / V2 (pré-vérification) |
| F2 | **Capacité de la salle face à l'effectif**, et équipements requis | Évite des salles trop petites | 🟡 `capacity` ✅ ; effectif d'une promotion ❌ (pas d'endpoint de comptage) ; équipements ❌ (modèle absent) | Élevé | V2 (capacité) / V3 (équipements) |
| F3 | **Récurrence hebdomadaire**, exceptions, jours fériés, vacances | Évite de ressaisir chaque semaine | 🟡 duplication de semaine à semaine ✅ (non exploitée) ; calendrier académique sans fériés ni vacances ❌ | Élevé | **MVP** (duplication) / V2 (fériés) |
| F4 | **Cycle de vie** brouillon → soumis → validé → archivé, avec historique | Traçabilité | 🟡 3 statuts ✅ et branchés ; ARCHIVÉ ❌ ; historique ❌ (seulement `created_at` / `updated_at`) | Moyen | V2 |
| F5 | **Duplication** (semaine suivante, semestre, autre programme) | Gain de temps majeur | 🟡 `POST /timetables/{id}/duplicate` ✅ (même promotion, tout ou rien) ; autre programme ❌ | Faible (front) / Élevé (autre programme) | **MVP** / V3 |
| F6 | **Notifications** (étudiants, enseignants) lors d'une modification | Information à temps | 🟡 un module `notification` existe (Email, SMS, WhatsApp, écouteurs Admission et Identity), mais aucun écouteur Scheduling | Moyen | V2 |
| F7 | **Vues personnelles** (étudiant, enseignant, salle) et **salles libres** | Usage quotidien | Étudiant ✅ ; enseignant ❌ (A3) ; salle ✅ `GET /timetable-entries/room/{id}` non exploité ; salles libres ❌ | Moyen | **MVP** (étudiant ✓, enseignant) / V2 (salle, salles libres) |
| F8 | **Volume horaire** par enseignant et par cours, comparé à la charge prévue | Pilotage pédagogique | ❌ (pas de charge prévue dans le modèle ; `credits` du cours seulement) | Élevé | V3 |
| F9 | **Exports** PDF, Excel, iCal (abonnement) | Diffusion, intégration aux agendas personnels | PDF : front (partie 2) ; Excel : front ou backend ❌ ; iCal : flux signé ❌ | Moyen / Élevé | V2 (PDF) / V3 (Excel, iCal) |
| F10 | **Glisser-déposer** des séances | Ergonomie de planification | ✅ `PUT /timetable-entries/{id}` (conflits renvoyés en 409) | Moyen | V2 |
| F11 | **Code couleur par type** (CM, TD, TP, examen) | Lecture rapide | 🟡 4 types : `LECTURE`, `PRACTICAL_WORK`, `EXAM`, `TEST`. Le **TD n'existe pas** ❌ | Faible | V2 |
| F12 | **Séances en ligne ou hybrides** | Enseignement à distance | 🟡 `RoomType.ONLINE` et `link` ✅ ; hybride ❌ | Faible / Moyen | V2 |

---

## 4. Parties 2 à 4 — Fiches

### 4.1 Impression des emplois du temps

**Existant**
- [timetable-calendar.scss:72-83](src/app/features/scheduling/timetable/components/timetable-calendar/timetable-calendar.scss#L72-L83) masque la barre d'outils et passe la hauteur en `auto`.
- [timetable.scss:5-12](src/app/features/scheduling/timetable/pages/timetable/timetable.scss#L5-L12) masque le sous-titre, les boutons et les sélecteurs. Ces règles sont encapsulées dans le composant et ne touchent donc que lui.
- Il n'y a **aucune règle d'impression globale** : la barre latérale, la barre du haut et le pied de page s'impriment.
- Il n'y a ni en-tête, ni logo, ni intitulé. Avec la grille 00:00–24:00, la page imprimée s'étale sur plusieurs feuilles.
- Il n'existe ni bouton « Imprimer » ni génération de PDF.

**Référence de style** (capture fournie, le fichier « Horaire Faculté » étant introuvable) :
- un tableau, avec une première ligne d'en-tête bleue : « Semaine N » puis les jours de la semaine ;
- une ligne de dates ;
- **une ligne par créneau** (« 8h00 - 12h00 »), dont chaque cellule donne le cours (bleu), l'enseignant avec son grade (bordeaux) et la salle (rouge) ;
- une **ligne grise de pause** entre la matinée et l'après-midi ;
- des cellules vides pour les jours sans cours.

**Approches comparées**

| Approche | Avantages | Inconvénients |
|---|---|---|
| A. `@media print` sur la vue FullCalendar | Rapide | Grille horaire continue et non tabulaire, contrôle faible de l'en-tête et des coupures de page, rendu différent de la référence |
| **B. Composant d'impression dédié** (tableau HTML + `window.print()`) | Rendu identique à la référence, contrôle total (A4 paysage, coupures, couleurs), aucune dépendance, testable | Second rendu à maintenir |
| C. PDF côté client (pdfmake / jsPDF) | Fichier téléchargeable | +300 à 500 kB, même s'ils sont chargés à la demande ; mise en page codée en JavaScript |
| D. PDF côté API (OpenPDF / Jasper) | Document officiel, archivable, identique pour tous | Développement backend, endpoint à créer |

**Solution proposée : B maintenant, D plus tard si un document officiel est nécessaire.**

1. Une fonction pure `buildPrintGrid(entries, weekStart)` construit la grille :
   - colonnes : lundi à samedi, plus le dimanche s'il porte des séances ;
   - lignes : créneaux distincts (`start_hour`–`end_hour`), triés ;
   - une ligne de pause est insérée quand deux créneaux successifs sont séparés d'au moins une heure.
2. Le composant `TimetablePrint` affiche :
   - **à gauche**, le logo `appBrand.logos.main` (`public/images/icons/logo.png`), servi par `CoreSettingsStore.brand` ;
   - **au centre**, « Horaire » puis l'intitulé et la période, du `week_start` au `week_end` (champs de `TimetableResponse`) ;
   - un **titre de niveau 2** formé de `program_level_name` et `program_name` (par exemple « L1 — Génie informatique ») ;
   - puis le tableau.
3. La feuille d'impression :
   - `@page { size: A4 landscape; margin: 10mm; }` ;
   - `print-color-adjust: exact`, pour garder l'en-tête bleu et la ligne grise ;
   - `break-inside: avoid` sur les lignes ;
   - **une semaine par page** (`break-after: page`) ;
   - en noir et blanc, rien ne repose sur la seule couleur : cours en gras, enseignant en italique, salle précédée de « Salle ».
4. Une route `timetable/:id/print`, sans le shell applicatif (route frère hors `AppLayout`, ou masquage global de `.layout-sidebar` et `.layout-topbar` en `@media print`). Elle lance l'impression une fois les données chargées.
5. Une action « Imprimer » est ajoutée dans le sous-titre du formulaire, dans le calendrier quand une promotion est choisie (semaine affichée) et dans « Mon horaire » (route `my-timetable/print?week=`).

**Fichiers impactés**
- À créer :
  - `components/timetable-print/timetable-print.{ts,html,scss}` ;
  - `pages/timetable-print/timetable-print.ts` ;
  - `utils/timetable-print-grid.ts` et sa spec.
- À modifier :
  - `timetable/routes.ts` ;
  - les actions de `timetable-form.ts:201`, `timetable.ts:76` et `my-timetable` ;
  - `public/layout/` (une règle `@media print` globale pour le shell).

**Dépendances backend** : aucune pour B. L'**intitulé de l'année académique** n'est pas dans `TimetableResponse` (seulement `academic_year_id`) : il faut un appel au catalogue académique, ou un ajout côté backend.

**Risques** : si des créneaux d'une même semaine se chevauchent partiellement (par exemple 08:00–10:00 et 09:00–11:00, cas impossible pour une même promotion mais possible pour la vue enseignant), une ligne par créneau ne suffit plus. Il faudra une règle de fusion. Les navigateurs gèrent aussi `@page` différemment selon leur moteur.

**Effort** : moyen (3-4 j, tests compris). **Faisabilité** : faisable avec réserve, car le fichier « Horaire Faculté » de référence est introuvable (Q1).

### 4.2 Design — Esthétique globale du calendrier

**Existant**
- Les couleurs des événements sont des aplats ([scss:46-64](src/app/features/scheduling/timetable/components/timetable-calendar/timetable-calendar.scss#L46-L64)).
- L'en-tête du jour utilise des tokens clairs figés (l. 9-10), et l'indicateur de l'heure courante est celui par défaut de FullCalendar.
- La grille couvre 00:00–24:00.
- Aucun état vide n'est dessiné dans les grilles : `noEventsContent` n'agit que dans la vue liste.

**Solution proposée**
1. Rattacher FullCalendar aux tokens PrimeNG, ce qui fait suivre automatiquement le preset `UNHPreset` et le mode sombre `.app-dark` :
   ```scss
   .timetable-calendar {
       --fc-border-color: var(--p-content-border-color);
       --fc-page-bg-color: var(--p-content-background);
       --fc-neutral-bg-color: var(--p-surface-50);
       --fc-today-bg-color: color-mix(in srgb, var(--p-primary-color) 7%, transparent);
       --fc-now-indicator-color: var(--p-red-500);
       --fc-list-event-hover-bg-color: var(--p-content-hover-background);
       --fc-button-bg-color: var(--p-content-background);
       --fc-button-text-color: var(--p-text-color);
       --fc-button-border-color: var(--p-content-border-color);
       --fc-button-active-bg-color: var(--p-primary-color);
   }
   .app-dark .timetable-calendar { --fc-neutral-bg-color: var(--p-surface-800); }
   ```
2. Faire des séances des **cartes** plutôt que des aplats : fond teinté, liseré gauche de 4 px dans la couleur du type, texte en couleur foncée. Le contraste est meilleur, et le rendu fonctionne en sombre :
   ```scss
   .fc-event[class*='timetable-session-'] {
       --session: var(--p-primary-color);
       background: color-mix(in srgb, var(--session) 14%, var(--p-content-background));
       border: 0; border-left: 4px solid var(--session);
       color: var(--p-text-color);
       border-radius: var(--p-border-radius-sm);
   }
   .timetable-session-practical-work { --session: var(--p-teal-500); }
   .timetable-session-exam { --session: var(--p-red-500); }
   .timetable-session-test { --session: var(--p-amber-500); }
   ```
3. En-têtes de jour : libellé court en petites capitales, le jour courant marqué par une pastille de couleur primaire plutôt qu'un fond plein.
4. Plage 07:00–20:00 (A9), et lignes de demi-heure discrètes (`slotLabelInterval: '01:00'`).
5. États vides : une surcouche centrée (icône `pi pi-calendar` et message) quand aucune promotion n'est choisie, ou quand la semaine n'a aucune séance validée, dans toutes les vues.
6. Légende des types de séance sous la barre d'outils, avec des pastilles `p-tag` dans les couleurs ci-dessus.

**Fichiers impactés** : `timetable-calendar.{ts,scss,html}`. **Backend** : aucun. **Risques** : vérifier les contrastes en sombre (AA ≥ 4,5:1 sur le texte des cartes). **Effort** : faible à moyen (1,5 j). **Faisabilité** : faisable.

### 4.3 Design — Sélection de la vue en `p-select` et barre d'outils mobile

**Existant** : barre d'outils native de FullCalendar (boutons Jour / Semaine / Mois / Liste), placée en pied de calendrier sur mobile ([timetable-calendar.ts:31-43](src/app/features/scheduling/timetable/components/timetable-calendar/timetable-calendar.ts#L31-L43)). Les filtres Programme et Niveau sont dans la page, au-dessus.

**Ce que la bibliothèque permet** : `headerToolbar: false` et `footerToolbar: false` désactivent la barre native, et l'API `CalendarApi` pilote tout le reste :
- `prev()`, `next()`, `today()` et `gotoDate()` pour la navigation ;
- `changeView(type)` pour la vue ;
- `view.title` pour le titre, mis à jour dans `datesSet`.

**Solution proposée**
- Un composant `TimetableToolbar` (dans `components/`) affiche :
  - des boutons icônes `p-button` text pour précédent, suivant et Aujourd'hui ;
  - le titre ;
  - un `p-select` des vues (Jour, Semaine, Mois, Liste) ;
  - un emplacement de projection pour les filtres.
- `TimetableCalendar` expose `view`, `title`, `range` en signaux, et des méthodes `prev()`, `next()`, `today()`, `setView()`.
- Sur ordinateur, tout tient sur une ligne : navigation à gauche, titre au centre, vue et filtres à droite.
- Sur mobile, la barre est compacte sur une ligne : ‹ › et le titre, puis le `p-select` de vue, réduit à une icône ou à un label court, et un bouton « Filtres » qui ouvre un `p-drawer` (bas) avec Programme et Niveau.
- La vue choisie est mémorisée (`localStorage`, avec repli silencieux).
- Classes Tailwind envisagées : `flex flex-wrap items-center gap-2`, `min-w-0`, `sm:flex-nowrap`.

**Fichiers impactés** : `components/timetable-toolbar/*` (nouveau), `timetable-calendar.ts` (retrait de `responsiveOptions` pour les barres), `timetable.html` et `my-timetable.html`. **Backend** : aucun. **Risques** : perte des raccourcis clavier natifs des boutons de FullCalendar, à compenser par des `p-button` focalisables avec `aria-label`. **Effort** : moyen (2 j). **Faisabilité** : faisable.

### 4.4 Design — Liste des emplois du temps

**Existant** ([timetable-pending.html](src/app/features/scheduling/timetable/pages/timetable-pending/timetable-pending.html)) :
- un `p-selectbutton` de statut, au-dessus du tableau, à gauche (l. 6) ;
- colonnes Programme / Niveau / Semaine de début / Statut / Actions (l. 42-46), **sans faculté** ;
- tri `weekStart,asc` ([timetable-pending.ts:128](src/app/features/scheduling/timetable/pages/timetable-pending/timetable-pending.ts#L128)) ;
- pagination serveur de 10 lignes.

**Regroupement recommandé : par faculté.** Le regroupement par statut n'a pas de sens, puisque la liste est déjà filtrée sur un statut. À l'intérieur d'une faculté, les lignes sont triées par programme, niveau, puis date.
- `p-table` en `rowGroupMode="subheader"` avec `groupRowsBy="faculty_name"`. L'en-tête de groupe affiche le nom de la faculté et un compteur.
- Le **tri serveur** passe à `sort=facultyName,asc&sort=programName,asc&sort=programLevelName,asc&sort=weekStart,asc`, pour que les groupes soient contigus d'une page à l'autre. PrimeNG répète l'en-tête de groupe en haut de chaque page.
- Pour un SAF, qui ne voit qu'une faculté, l'en-tête de groupe est masqué.

**Filtre en haut à droite** : un `p-select` simple (Brouillons, Soumis, Validés) dans le `caption` du tableau (`flex justify-end`), ou dans les actions du sous-titre si l'on préfère la convention Odoo déjà adoptée. Sur mobile, il passe sur toute la largeur au-dessus des cartes.

**Colonnes, dans l'ordre demandé** :
1. **Faculté / Niveau / Programme** : une seule cellule sur deux lignes, avec la faculté en petit et en gris (`text-sm text-muted-color`), puis « L1 — Génie informatique » ;
2. **Date de début** : `week_start` au format long ;
3. **Statut** : `p-tag` ;
4. **Actions**.

Les libellés `data-label` des cartes mobiles sont à mettre à jour.

**Fichiers impactés** : `timetable-pending.{ts,html,scss}` et sa spec. **Backend** : ✅ le tri multi-champs est accepté par `Pageable`. Les noms de propriétés (`facultyName`, `programName`, `programLevelName`) sont ceux de l'entité, à vérifier en appelant l'API. **Risques** : un tri sur un champ inexistant renvoie une erreur 500 ; à tester. **Effort** : faible (1 j). **Faisabilité** : faisable.

### 4.5 Widget « Horaire » sur la page d'accueil

**Existant** :
- [dashboard.ts:11-17](src/app/pages/dashboard/dashboard.ts) dessine une grille de 12 colonnes, sans **notion de colonne de droite**, où chaque widget a une taille (`sm`, `md`, `lg`, `xl`, `full`) ;
- `DashboardWidget.component` est un `Type<unknown>` importé statiquement, ce qui met tous les widgets dans le bundle initial (M12) ;
- les widgets actuels sont : 3 tuiles `sm` (utilisateurs, facultés, professeurs, candidats) et une répartition en `full` ;
- le dashboard n'est pas `OnPush`.

**Solution proposée**
1. **Mise en page** :
   - ajouter `region?: 'main' | 'aside'` à `DashboardWidget` ;
   - le dashboard devient `grid-cols-12`, avec la région principale en `col-span-12 xl:col-span-8` (sa grille interne inchangée) et la colonne de droite en `col-span-12 xl:col-span-4` ;
   - sans widget `aside`, la région principale garde toute la largeur : **aucune régression**.
2. **Chargement paresseux (M12)** : accepter `loadComponent?: () => Promise<Type<unknown>>`, résolu dans le dashboard (signal et `NgComponentOutlet`, ou `@defer (on viewport)`). Le widget Scheduling est le premier à l'utiliser.
3. **Contenu** : le widget **n'embarque pas FullCalendar**. C'est une liste compacte du jour, avec onglets « Aujourd'hui » et « Semaine » : heure, cours, salle, pastille de type. Elle reprend `toCalendarSession`, et un chunk de quelques kilo-octets suffit.
4. **Bouton « Plein écran »** (`pi pi-window-maximize`) : il ouvre `/scheduling/my-timetable` pour un étudiant ou un enseignant, et `/scheduling/timetable` pour un admin ou un SAF.

**Selon le profil**

| Profil | Source | Remarque |
|---|---|---|
| Étudiant | `GET /api/v1/timetables/me/week` ✅ | Une semaine non publiée renvoie 404, affiché comme un état vide. |
| Enseignant | ❌ **pas `/timetables/me/week`** | Cet endpoint est réservé aux étudiants : il retrouve l'utilisateur par `StudentRepository` et renvoie 404 « Aucun profil étudiant » pour un enseignant. Il faut l'endpoint A3, ou le contournement de « Mon horaire » (affectations → séances), coûteux sur un dashboard. |
| Admin, SAF | Pas d'horaire personnel | Voir Q4 : chiffres (brouillons, soumis, validés de la semaine), dernière promotion consultée, ou rien. |

**Permissions** : `TimetableEntryReadOwn` pour étudiant et enseignant ; `TimetableCreateAll` ou `TimetableUpdateAll` en mode `any` pour admin et SAF. Ce sont les mêmes clés que les routes cibles.

**Fichiers impactés** : `core/modules/app-feature.model.ts` (`region`, `loadComponent`), `pages/dashboard/dashboard.ts` (deux régions, `OnPush`), `features/scheduling/dashboard/dashboard.widgets.ts` et `components/timetable-widget.ts` (nouveaux), `scheduling.feature.ts` (`dashboardWidgets`).

**Dépendances backend** : A3 pour l'enseignant. **Risques** : le changement de modèle `DashboardWidget` touche les quatre features ; le garder rétrocompatible (`component` ou `loadComponent`). **Effort** : moyen (2-3 j). **Faisabilité** : faisable avec réserve, car le contenu enseignant et admin dépend de A3 et de Q4.

### 4.6 Bouton Retour vers l'écran précédent

**Existant**
- [timetable-form.ts:202](src/app/features/scheduling/timetable/pages/timetable-form/timetable-form.ts#L202) : action « Retour » avec un `routerLink` **fixe** vers `TIMETABLE_PATH` (le calendrier).
- [timetable-form.ts:563](src/app/features/scheduling/timetable/pages/timetable-form/timetable-form.ts#L563) : « Annuler » appelle aussi `navigate([TIMETABLE_PATH])`.
- Après enregistrement, la page redirige vers la liste ([l. 891](src/app/features/scheduling/timetable/pages/timetable-form/timetable-form.ts#L891)). C'est voulu, mais l'utilisateur qui venait du calendrier y perd sa place.
- [timetable-pending.ts:75](src/app/features/scheduling/timetable/pages/timetable-pending/timetable-pending.ts#L75) : « Calendrier » est un lien de navigation, pas un retour. Ce n'est pas un défaut.
- Un service partagé existe déjà : [DetailNavigationService](src/app/shared/navigation/detail-navigation.service.ts). Il mémorise le contexte d'une liste (route, page, filtres) pour les fiches de détail.

**Solution proposée** : une fonction utilitaire partagée, par exemple `shared/navigation/go-back.ts` :
```ts
export function goBack(router: Router, location: Location, fallback: string[]): void {
    // navigationId > 1 : la page a été atteinte par une navigation interne, l'historique est sûr.
    const state = location.getState() as { navigationId?: number } | null;
    if ((state?.navigationId ?? 0) > 1) location.back();
    else void router.navigate(fallback); // lien profond, nouvel onglet, rechargement
}
```
- « Retour » et « Annuler » l'appellent, avec `TIMETABLE_PATH` comme repli.
- **Point d'attention** : la création automatique d'un horaire appelle `location.replaceState(...)` ([l. 744-758](src/app/features/scheduling/timetable/pages/timetable-form/timetable-form.ts#L744)), qui **efface `navigationId`**. Il faut lui transmettre l'état courant (`replaceState(url, '', location.getState())`), sinon le retour bascule toujours sur le repli.
- La garde de sortie (`timetableFormLeaveGuard`) s'applique aussi à `location.back()` : le comportement est conservé.
- Optionnel : depuis la liste, enregistrer le contexte dans `DetailNavigationService` pour revenir à la bonne page et au bon filtre.

**Fichiers impactés** : `shared/navigation/go-back.ts` et sa spec (nouveaux), `timetable-form.ts` (actions, `cancel()`, `replaceState`), `timetable-form.spec.ts`. **Autres modules** : 14 fichiers utilisent `DetailNavigationService`. Je n'ai pas audité leurs boutons Retour hors Scheduling (hors périmètre), mais l'utilitaire leur est réutilisable. **Effort** : faible (0,5 j). **Faisabilité** : faisable.

### 4.7 Couverture de l'API Scheduling

| Méthode | Chemin | Description | Service (fichier:ligne) | Utilisé dans l'interface | Branchement proposé |
|---|---|---|---|---|---|
| GET | `/api/v1/timetables` | Lister (filtres, pagination) | ✅ [timetable.service.ts:20](src/app/features/scheduling/timetable/services/timetable.service.ts#L20) | ✅ Liste, calendrier, badge, 409 | Le filtre `week` est cassé (A1) |
| POST | `/api/v1/timetables` | Créer une semaine | ✅ l. 38 | ✅ Formulaire (création automatique) | — |
| GET | `/api/v1/timetables/{id}` | Détail | ✅ l. 34 | ✅ Édition, Mon horaire (enseignant) | — |
| DELETE | `/api/v1/timetables/{id}` | Supprimer | ✅ l. 46 | 🟡 Brouillons orphelins seulement | Action « Supprimer » sur un brouillon (liste, formulaire) — A12 |
| PATCH | `/api/v1/timetables/{id}/status` | Changer le statut | ✅ l. 42 | ✅ Formulaire (sous-titre) | Possible aussi en action rapide dans la liste |
| **POST** | **`/api/v1/timetables/{id}/duplicate`** | **Dupliquer vers une autre semaine** | ❌ | ❌ | **Action « Dupliquer » dans le formulaire et la liste** : fenêtre avec un sélecteur de lundi cible ; en 422, liste des séances refusées avec leur index dans la semaine source — F5 |
| GET | `/api/v1/timetables/me/week` | Ma semaine (étudiant) | ✅ l. 28 | ✅ Mon horaire (étudiant) | Widget dashboard |
| POST | `/api/v1/timetable-entries` | Créer des séances (lot) | ✅ [timetable-entry.service.ts:18](src/app/features/scheduling/timetable/services/timetable-entry.service.ts#L18) | ✅ Enregistrement | — |
| GET | `/api/v1/timetable-entries/{id}` | Détail d'une séance | ❌ | ❌ | Lien profond vers une séance (notification, iCal) — V2 |
| PUT | `/api/v1/timetable-entries/{id}` | Modifier une séance | ✅ l. 25 | ✅ Enregistrement par différence | Glisser-déposer — F10 |
| DELETE | `/api/v1/timetable-entries/{id}` | Supprimer une séance | ✅ l. 29 | ✅ Enregistrement par différence | — |
| GET | `/api/v1/timetable-entries/timetable/{id}` | Toutes les séances d'un horaire | ✅ l. 47 | ✅ Édition | — |
| GET | `/api/v1/timetable-entries/timetable/{id}/week` | Semaine d'un horaire | ✅ l. 34 | ✅ Calendrier de gestion | Impression |
| GET | **`/api/v1/timetable-entries/timetable/{id}/range`** | Plage de dates | ❌ | ❌ | Vue Mois ou semestre d'une promotion (un appel au lieu d'un par semaine) |
| GET | **`/api/v1/timetable-entries/room/{roomId}`** | **Occupation d'une salle** | ❌ | ❌ | **Vue salle** : un onglet « Occupation » dans Paramètres › Salles ou un filtre Salle dans le calendrier ; base de la recherche de salles libres — F7 |
| GET | **`/api/v1/timetable-entries/course-assignment/{id}`** | Séances d'une affectation | ✅ l. 41 | 🟡 Contournement de la vue enseignant | **Fiche cours ou affectation (Académique)** : séances planifiées et volume horaire réalisé — F8 ; à remplacer pour l'enseignant par A3 |
| GET | `/api/v1/rooms` | Lister les salles | ✅ [room.service.ts:17](src/app/features/scheduling/services/room.service.ts#L17) | ✅ Salles, fenêtre de session | — |
| POST, PUT, DELETE | `/api/v1/rooms`, `/rooms/{id}` | CRUD des salles | ✅ l. 26-34 | ✅ Salles | — |
| GET | `/api/v1/rooms/{id}` | Détail d'une salle | ✅ l. 21 | ❌ | Fiche salle avec son occupation (avec `/timetable-entries/room`) |

**Bilan : 21 endpoints, 17 implémentés dans un service, 14 réellement exploités.** Restent inexploités : **duplication**, plage de dates, détail d'une séance, occupation d'une salle, détail d'une salle, et, en partie, suppression d'un horaire et séances d'une affectation.

### 4.8 Identité — options `/me` (état des lieux)

| Endpoint (spec Identity) | Front : service | Front : écran | Constat |
|---|---|---|---|
| `GET /api/v1/users/me` | ❌ | ❌ | La page Profil appelle **`GET /users/{id}`** ([user-profile.ts:140](src/app/features/identity/users/pages/user-profile/user-profile.ts#L140)), un endpoint d'administration. Ça fonctionne seulement si l'utilisateur a les droits de lecture adéquats. |
| `PUT /api/v1/users/me` (`username`, `email`) | ❌ | ❌ | La page Profil enregistre par **`PUT /users/{id}`** ([user-profile.ts:319](src/app/features/identity/users/pages/user-profile/user-profile.ts#L319)) : même risque de 403 pour un compte sans droit d'administration. |
| `PUT /api/v1/users/me/password` | ✅ [user.service.ts:132](src/app/features/identity/users/services/user.service.ts#L132) | ✅ Profil ([l. 180](src/app/features/identity/users/pages/user-profile/user-profile.ts#L180)) | Doublon mort : `UserPassword` ([pages/user-password](src/app/features/identity/pages/user-password/user-password.ts)), jamais routé (m10). Son validateur est trop restrictif (audit §6.7). |
| `GET /api/v1/users/me/avatar/upload-url` | ✅ l. 108 | ✅ Profil | — |
| `POST /api/v1/users/me/avatar/confirm` | ✅ l. 124 | ✅ Profil | — |
| `DELETE /api/v1/users/me/avatar` | ✅ l. 128 | ✅ Profil ([l. 278](src/app/features/identity/users/pages/user-profile/user-profile.ts#L278)) | ⚠️ **Absent de la spec OpenAPI** : l'appel aboutira à 404 ou 405, sauf si l'endpoint existe sans être documenté. À vérifier côté backend. |
| Préférences (thème, palette…) | — | ✅ `/identity/preferences` | Stockées côté navigateur : **aucun endpoint de préférences** dans l'API, donc pas de synchronisation d'un appareil à l'autre. |
| `forgot-password`, `reset-password`, `refresh-token`, `logout` | ✅ `AuthService` | ✅ | — |

**Manques à traiter ensuite** :
- passer le Profil sur `GET` et `PUT /users/me` ;
- statuer sur `DELETE /me/avatar` (documenter ou ajouter côté backend) ;
- supprimer ou router `UserPassword` (m10) ;
- décider s'il faut persister les préférences côté serveur.

---

## 5. Questions ouvertes

1. **Q1 — Fichier « Horaire Faculté »** : introuvable dans le dépôt. Où se trouve-t-il, et sous quel format (Excel, Word, PDF) ? Faut-il prendre la capture fournie comme référence unique, en particulier pour les couleurs (bleu cours, bordeaux enseignant, rouge salle), la ligne de pause grise et le libellé « Semaine N » ?
2. **Q2 — « Semaine N »** : numérotée depuis le début de l'année académique, du semestre, ou selon le numéro ISO ?
3. **Q3 — Regroupement de la liste** : faculté → programme → niveau (recommandé), ou un autre ordre ?
4. **Q4 — Widget admin et SAF** : chiffres (brouillons, soumis, validés), dernière promotion consultée, ou pas de widget ?
5. **Q5 — Widget enseignant** : faut-il attendre l'endpoint `/timetable-entries/me/week` (A3), ou accepter le contournement actuel, plus coûteux et fondé sur `read:all` ?
6. **Q6 — Portée faculté** : qui fait foi, le profil `ACADEMIC_SECRETARY` (Scheduling) ou la permission `academic:faculty:read:own` (Académique) ? Il faut une seule règle (V1).
7. **Q7 — Types de séance** : ajouter **TD** (et Hybride) au backend ? Le code couleur CM, TD, TP, examen en dépend.
8. **Q8 — Impression** : `window.print()` suffit-il pour la V2, ou faut-il un **PDF officiel généré par l'API** (archivage, signature) ?
9. **Q9 — Plage horaire du calendrier** : 07:00–20:00 pour tous, ou réglable par faculté ?
10. **Q10 — Périmètre backend** : les correctifs A1, A2, A3, A5 et la portée `:faculty` seront-ils pris en charge par l'équipe Spring, et dans quel ordre ?

---

## 6. Plan de mise en œuvre

Les lots sont indépendants, et ordonnés selon le rapport valeur / effort.

| Lot | Contenu | Effort | Prérequis | Tests à écrire |
|---|---|---|---|---|
| **1 — Navigation et barre d'outils** | `goBack()` partagé et « Retour » / « Annuler » (4.6, avec correction du `replaceState`) ; `TimetableToolbar` avec `p-select` de vue et filtres en tiroir sur mobile (4.3) ; plage 07:00–20:00 (A9) ; permission de l'action « en attente » alignée (A8) | 2,5 j | — | `goBack` : historique interne contre lien profond ; toolbar : `changeView`, prev / next / today, titre ; formulaire : Retour après création automatique |
| **2 — Liste des horaires** | Regroupement par faculté, tri multi-champs, filtre `p-select` en haut à droite, colonnes demandées, cartes mobiles mises à jour (4.4) | 1 j | Q3 ; tri multi-champs vérifié sur l'API | Requête de tri ; en-têtes de groupe ; masquage pour un SAF ; filtre |
| **3 — Esthétique du calendrier** | Tokens FullCalendar ↔ PrimeNG, cartes de séance, états vides, légende, accessibilité clavier des séances, mode sombre (4.2, A10, A11) | 1,5 j | — | Spec du composant (classes, `eventDidMount` tabindex) ; contrôle visuel clair et sombre |
| **4 — Impression** | `buildPrintGrid`, `TimetablePrint`, route `:id/print`, action « Imprimer » (formulaire, calendrier, Mon horaire), règles `@media print` du shell (4.1) | 3-4 j | Q1, Q2 | `buildPrintGrid` (créneaux, pause, dimanche, chevauchements) ; en-tête (logo, période, niveau et programme) ; route et permissions |
| **5 — Widget dashboard** | `DashboardWidget.region` et `loadComponent` (M12), dashboard en deux régions et `OnPush`, widget compact sans FullCalendar, « Plein écran » (4.5) | 2-3 j | Q4, Q5 (A3 pour l'enseignant) | Dashboard : régions et rétrocompatibilité ; widget par profil ; le chunk du widget n'est pas dans le bundle initial (contrôle de build) |
| **6 — Endpoints inexploités** | Duplication (fenêtre et erreurs 422 par séance), suppression d'un brouillon, occupation d'une salle (onglet Salles), plage de dates pour la vue Mois (4.7) | 3 j | — | Service et page : duplication réussie, 409 (semaine existante), 422 (séances refusées) ; suppression confirmée ; vue salle |
| **7 — Identité `/me`** | Profil sur `GET` et `PUT /users/me`, statut de `DELETE /me/avatar`, sort de `UserPassword` (4.8) | 1 j | Arbitrage backend sur l'avatar | Service `/me` ; Profil sans droit d'administration |
| **Backend (en parallèle)** | A1 (filtre `week`), A3 (`/timetable-entries/me/week`), A2 (conflit enseignant), A5 (grade), portée `:faculty`, TD et Hybride | — | Q10 | Côté front : retrait des contournements (plafonds de 100, annuaire des professeurs, `read:all` de l'enseignant) |

**Exigences transverses vérifiées pour chaque lot** :
- `OnPush` et signaux ;
- souscriptions sous `takeUntilDestroyed` ;
- permissions identiques entre route, menu, actions et widget ;
- pas de nouvelle pagination plafonnée ;
- erreurs serveur affichées par `timetableErrorMessage` ;
- responsive (cartes ou tiroir en dessous de 640 px) et mode sombre (uniquement des tokens) ;
- accessibilité (`aria-label`, focus clavier, contrastes AA) ;
- aucun ajout au bundle initial : FullCalendar et le widget restent paresseux, sans nouvelle dépendance pour l'impression (approche B).
