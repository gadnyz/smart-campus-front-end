# Installation

Ce guide explique comment installer le front-end, le configurer, le lancer et exécuter ses contrôles. Il s'adresse à un développeur qui prépare son poste pour la première fois.

## Prérequis

| Outil | Version | Source |
|---|---|---|
| Node.js | 22 | Image `node:22-alpine` des fichiers `Dockerfile` et `Dockerfile.dev` |
| npm | 11.9.0 dans les images Docker | Argument `NPM_VERSION` des fichiers `Dockerfile` et `Dockerfile.dev` |
| Git | — | — |
| Docker | — | Uniquement pour le lancement en conteneur |
| API backend | — | Doit répondre sur `http://localhost:8085` pour que l'application affiche des données |

`package.json` ne déclare pas de champ `engines` : aucune version de Node.js n'est imposée à l'installation. L'Angular CLI n'a pas besoin d'être installée globalement : les scripts npm et `npx ng` utilisent celle du projet.

!!! warning "À compléter"
    La procédure pour lancer l'API backend en local n'est pas décrite dans ce dépôt. Demandez-la à l'équipe backend.

## Installer le projet

1. Clonez le dépôt.

    ```bash
    git clone https://github.com/gadnyz/smart-campus-front-end.git
    cd smart-campus-front-end
    ```

2. Installez les dépendances. La commande respecte les versions de `package-lock.json`.

    ```bash
    npm install
    ```

    Résultat attendu : un dossier `node_modules/` est créé, sans erreur.

## Configuration

### Fichiers d'environnement

La configuration de l'application se trouve dans `src/environments/`. Le fichier `environment.ts` est celui que le code importe. À la compilation, Angular le remplace selon la configuration choisie (`fileReplacements` dans `angular.json`).

| Fichier | Utilisé par |
|---|---|
| `environment.ts` | Fichier importé par le code. Il est remplacé lors des builds de développement et de production. Les tests (`ng test`) l'utilisent tel quel, car la cible `test` ne déclare aucun remplacement. |
| `environment.development.ts` | Configuration `development` : `npm start`, `ng serve`, `npm run watch` |
| `environment.production.ts` | Configuration `production` : `npm run build`, `npm run build:prod` |
| `environment.development.spec.ts` | Test qui vérifie que `apiBaseUrl` reste vide en développement |

Le tableau suivant liste les clés de configuration.

| Clé | Description | Valeur de développement | Lue par le code |
|---|---|---|---|
| `production` | Indique un build de production | `false` | Non, seulement par `environment.development.spec.ts` |
| `appName` | Nom affiché de l'application | `'Smart-campus'` | Oui, `core/config/app-brand.ts` |
| `univesity` | Sigle de l'université. La clé est orthographiée ainsi dans le code. | `'UNH'` | Oui, `core/config/app-brand.ts` |
| `apiBaseUrl` | Préfixe des URL de l'API. Vide en développement, pour passer par le proxy. | `''` | Oui, par les services HTTP |
| `enableDebug` | Indicateur de débogage | `true` | Non |

!!! warning
    N'ajoutez jamais de mot de passe ni de secret dans un fichier `src/environments/*` : ces fichiers sont versionnés et intégrés au code envoyé au navigateur.

!!! warning "À compléter"
    Indiquez l'URL de l'API à utiliser en production : `environment.production.ts` pointe actuellement vers `http://localhost:8085` (équipe backend).

### Proxy de développement

En développement, `apiBaseUrl` est vide. Les services appellent donc des URL relatives comme `/api/v1/rooms`, sur la même origine que l'application. Le serveur de développement relaie ces appels vers l'API, ce qui évite les erreurs CORS du navigateur.

| Fichier | Contexte | Cible |
|---|---|---|
| `proxy.conf.json` | `npm start` et `ng serve` (option `proxyConfig` de la cible `serve` dans `angular.json`) | `http://localhost:8085` |
| `proxy.conf.docker.json` | Lancement avec `docker-compose.dev.yml` | `http://host.docker.internal:8085` |

Les deux fichiers relaient le chemin `/api`, avec `changeOrigin: true` et `secure: false`.

## Lancer et vérifier

| Commande | Effet |
|---|---|
| `npm start` | Serveur de développement sur `http://localhost:4200`, avec le proxy |
| `npm run build` | Build de production dans `dist/smart-campus` (configuration par défaut : `production`) |
| `npm run build:prod` | Même build, avec la configuration `production` explicite |
| `npm run watch` | Build de développement relancé à chaque modification |
| `npm test` | Tests unitaires avec Karma, en mode surveillance |
| `npm run test:ci` | Tests unitaires en une passe, dans Chrome sans interface, avec la couverture de code |
| `npm run lint` | Analyse ESLint des fichiers `src/**/*.ts` et `src/**/*.html` |
| `npm run format` | Formatage Prettier des fichiers `js`, `mjs`, `ts`, `mts`, `d.ts` et `html` |

Pour démarrer l'application :

1. Vérifiez que l'API répond sur `http://localhost:8085`.
2. Lancez le serveur de développement.

    ```bash
    npm start
    ```

3. Ouvrez `http://localhost:4200`.

    Résultat attendu : la page de connexion s'affiche.

Si le port 4200 est déjà utilisé, lancez le serveur sur un autre port. Le proxy reste actif, car il est déclaré dans `angular.json`.

```bash
npx ng serve --port 4300
```

## Lancer avec Docker

### Développement

`docker-compose.dev.yml` lance `ng serve` dans un conteneur, avec le code source monté et le rechargement automatique.

1. Lancez l'environnement.

    ```bash
    docker compose -f docker-compose.dev.yml up --build
    ```

2. Ouvrez `http://localhost:4200`.
3. Arrêtez l'environnement.

    ```bash
    docker compose -f docker-compose.dev.yml down
    ```

Le conteneur joint l'API de la machine hôte par `host.docker.internal:8085` (`proxy.conf.docker.json`).

### Image de production

Le `Dockerfile` construit l'application avec `npm run build:prod`, puis la sert avec Nginx sur le port 80. L'exemple suivant publie ce port sur le port `8080` de la machine.

```bash
docker build -t smart-campus:local .
docker run -d -p 8080:80 --name smart-campus-app smart-campus:local
```

!!! note
    `nginx.conf` ne relaie pas `/api`. L'image de production appelle donc directement l'URL définie par `apiBaseUrl` dans `environment.production.ts`.

## Comptes de test

Aucun mot de passe n'est documenté ici.

!!! warning "À compléter"
    Indiquez comment un nouveau développeur obtient un compte administrateur et des comptes pour chaque profil métier, pour tester l'application (équipe backend).

## Générer le site de documentation

Cette documentation est écrite pour MkDocs avec le thème Material. MkDocs n'est pas une dépendance npm du projet.

1. Installez MkDocs Material.

    ```bash
    pip install mkdocs-material
    ```

2. À la racine du dépôt, lancez le serveur de documentation.

    ```bash
    mkdocs serve
    ```

    Résultat attendu : MkDocs affiche l'adresse locale du site dans le terminal.

## Problèmes fréquents

**Un toast affiche « Le serveur est injoignable. Vérifiez votre connexion puis réessayez. »**
L'API n'a pas répondu : ce message correspond à une réponse de statut 0 (`shared/http/api-error.ts`). Vérifiez que l'API répond sur `http://localhost:8085`, puis que vous avez lancé l'application avec `npm start` ou `ng serve`, qui activent le proxy.

**L'application lancée avec Docker n'atteint pas l'API.**
Le conteneur vise `host.docker.internal:8085`. L'API doit écouter sur le port 8085 de la machine hôte.

**Une erreur « Paramètre d'API … : l'API attend du snake_case. » apparaît dans la console.**
Un service a passé une clé en camelCase à `toApiParams` (`shared/http/api-params.ts`). Renommez la clé en snake_case, par exemple `program_level_id`.

**L'impression d'un horaire échoue avec « Le navigateur a bloqué l'ouverture de l'impression ».**
L'impression ouvre un nouvel onglet (`features/scheduling/timetable/services/timetable-export.service.ts`). Autorisez les fenêtres pour le site dans le navigateur.

**Le build de production échoue sur un budget.**
`angular.json` limite le bundle initial à 5 Mo (avertissement à 1 Mo) et le style d'un composant à 12 ko (avertissement à 10 ko). Réduisez le code chargé au démarrage, par exemple avec un chargement différé.

**Vous êtes déconnecté dans tous les onglets en même temps.**
C'est le comportement prévu. La session est stockée dans `localStorage` et synchronisée entre les onglets (`core/auth/services/auth.service.ts`). Une déconnexion dans un onglet s'applique aux autres.
