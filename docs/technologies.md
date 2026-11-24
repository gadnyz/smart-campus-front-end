# Technologies

Cette page de référence liste les technologies du front-end, leur version et leur usage dans le projet. Consultez-la avant d'ajouter une dépendance ou pour savoir quelle bibliothèque utiliser pour un besoin donné.

La colonne « Version déclarée » reprend `package.json`. La colonne « Version installée » reprend `package-lock.json`, qui fait foi après `npm install`.

## Framework et langage

| Technologie | Version déclarée | Version installée | Usage dans le projet |
|---|---|---|---|
| Angular (`@angular/core`, `common`, `forms`, `router`, `platform-browser`) | `^21` | 21.2.8 | Framework de l'application. Composants standalone, signals, détection des changements sans Zone.js (`provideZonelessChangeDetection` dans `src/app.config.ts`). |
| Angular CLI et build (`@angular/cli`, `@angular-devkit/build-angular`) | `^21` | 21.2.7 | Commandes `ng serve`, `ng build`, `ng test`, `ng lint`. Le build utilise le builder `application` (`angular.json`). |
| TypeScript | `~5.9.3` | 5.9.3 | Langage. Mode strict activé, ainsi que `strictTemplates` (`tsconfig.json`). |
| RxJS | `~7.8.0` | 7.8.2 | Appels HTTP et leur composition (`map`, `expand`, `catchError`). L'état des écrans repose sur les signals, pas sur RxJS (voir [Architecture](developpement/architecture.md)). |

## Interface

| Technologie | Version déclarée | Version installée | Usage dans le projet |
|---|---|---|---|
| PrimeNG | `^21.0.2` | 21.1.6 | Bibliothèque de composants : tableaux (`p-table`), formulaires, fenêtres, toasts, confirmations. |
| `@primeuix/themes` | `^2.0.0` | 2.0.3 | Thème Aura, adapté aux couleurs de l'UNH par `definePreset` dans `src/app.config.ts`. Le mode sombre s'active avec la classe `.app-dark`. |
| PrimeIcons | `^7.0.0` | 7.0.0 | Icônes `pi pi-*`, importées dans `public/styles.scss`. |
| Tailwind CSS (`tailwindcss`, `@tailwindcss/postcss`) | `^4.1.11` | 4.2.2 | Classes utilitaires de mise en page. Configuration dans `public/tailwind.css`. |
| `tailwindcss-primeui` | `^0.6.1` | 0.6.1 | Extension Tailwind qui expose les couleurs du thème PrimeNG, déclarée dans `public/tailwind.css`. |
| Chart.js | `4.4.2` | 4.4.2 | Graphiques du tableau de bord, utilisés à travers `primeng/chart` (par exemple `features/identity/dashboard/components/repartition_users.ts`). |
| FullCalendar (`@fullcalendar/angular`, `core`, `daygrid`, `timegrid`, `list`, `interaction`) | `^6.1.21` | 6.1.21 | Calendrier des horaires : `features/scheduling/timetable/components/timetable-calendar/`. |

## Données et formulaires

| Technologie | Version déclarée | Version installée | Usage dans le projet |
|---|---|---|---|
| Client HTTP Angular | inclus dans Angular | 21.2.8 | Appels à l'API, avec `withFetch()` et l'intercepteur `authInterceptor` (`src/app.config.ts`). |
| Formulaires Angular | inclus dans Angular | 21.2.8 | Formulaires réactifs pour l'édition, par exemple `features/scheduling/settings/pages/rooms/rooms.ts` ; formulaire template-driven (`ngModel`) pour la connexion, dans `core/auth/login.html`. |
| `libphonenumber-js` | `^1.13.7` | 1.13.7 | Liste des pays avec leur indicatif et validation des numéros de téléphone du formulaire de candidature (`features/admission/pages/candidate-create/candidate-create.ts`). |

## Export

| Technologie | Version déclarée | Version installée | Usage dans le projet |
|---|---|---|---|
| pdfmake | `^0.3.11` | 0.3.11 | Export et impression des horaires en PDF (`features/scheduling/timetable/utils/timetable-pdf.ts`). |
| ExcelJS | `^4.4.0` | 4.4.0 | Export des horaires au format Excel (`features/scheduling/timetable/utils/timetable-excel.ts`). |

pdfmake et ExcelJS sont chargés à la demande, au premier export : ils ne font pas partie du bundle initial (`features/scheduling/timetable/services/timetable-export.service.ts`). Ce sont des modules CommonJS, déclarés dans `allowedCommonJsDependencies` (`angular.json`).

## Qualité

| Technologie | Version déclarée | Version installée | Usage dans le projet |
|---|---|---|---|
| Jasmine (`jasmine-core`) | `~5.4.0` | 5.4.0 | Framework des tests unitaires (`*.spec.ts`). |
| Karma (`karma`, `karma-chrome-launcher`, `karma-coverage`, `karma-jasmine`) | `~6.4.0` | 6.4.4 | Exécution des tests dans Chrome. Aucun fichier `karma.conf.js` : la configuration par défaut du builder Angular s'applique. |
| ESLint (`eslint`, `@eslint/js`) | `^9.39.2` | 9.39.4 | Analyse statique, configurée dans `eslint.config.js`. |
| `angular-eslint` | `21.3.1` | 21.3.1 | Règles propres à Angular, pour le TypeScript et les templates. |
| `typescript-eslint` | `8.56.1` | 8.56.1 | Règles TypeScript. |
| Prettier | `^3.0.0` | 3.8.3 | Formatage, configuré dans `.prettierrc.json` : 4 espaces, guillemets simples, largeur de ligne 250. |

## Conteneurs et déploiement

| Élément | Fichier | Usage |
|---|---|---|
| Image de build Node.js | `Dockerfile`, `Dockerfile.dev` | `node:22-alpine`, avec npm 11.9.0 |
| Serveur web Nginx | `Dockerfile`, `nginx.conf` | `nginx:1.27-alpine` sert les fichiers construits et renvoie toute route vers `index.html` |
| Vercel | `vercel.json` | Réécrit toute route vers `index.html` |

## Dépendances à retirer

Les paquets `quill` (`^2.0.3`) et `primeclt` (`^0.1.5`) sont déclarés dans `package.json`, mais aucun fichier de `src/` ne les importe. Ils sont à retirer des dépendances. N'en ajoutez aucun usage.
