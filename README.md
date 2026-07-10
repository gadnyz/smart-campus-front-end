<a id="readme-top"></a>

<br />
<div align="center">
  <h3 align="center">Smart Campus Frontend 🎓</h3>

  <p align="center">
    Interface web moderne du projet Smart Campus, développée avec Angular pour les établissements d'enseignement supérieur.
    <br />
    <a href="#-pour-commencer"><strong>Explorer la Documentation »</strong></a>
    <br />
    <br />
    <a href="https://smart-campus-front-end.vercel.app/">Voir l'application</a>
    ·
    <a href="https://github.com/ortega-kb/smart-campus-backend">Voir le back-end</a>
    ·
    <a href="#">Signaler un Bug</a>
    ·
    <a href="#">Suggérer une Fonctionnalité</a>
  </p>
</div>

<details>
  <summary>Table des Matières</summary>
  <ol>
    <li>
      <a href="#-à-propos-du-projet">À propos du projet</a>
      <ul>
        <li><a href="#%EF%B8%8F-construit-avec">Construit avec</a></li>
      </ul>
    </li>
    <li>
      <a href="#-pour-commencer">Pour Commencer</a>
      <ul>
        <li><a href="#prérequis">Prérequis</a></li>
        <li><a href="#installation-et-déploiement">Installation et Déploiement</a></li>
      </ul>
    </li>
    <li><a href="#-architecture-et-normes">Architecture et Normes</a></li>
    <li><a href="#-cicd">CI/CD</a></li>
    <li><a href="#-compilation">Compilation</a></li>
  </ol>
</details>

## 📖 À propos du projet

Le projet **Smart Campus Frontend** constitue la couche de présentation de la plateforme Smart Campus. Il centralise les interfaces utilisateurs et les interactions métier côté client.

L'application est développée avec **Angular** et propose une base moderne, modulaire et maintenable pour construire les fonctionnalités du campus intelligent.

Le frontend est conçu pour :
- fournir une interface ergonomique et responsive
- consommer les API métiers du backend Smart Campus
- faciliter les démonstrations fonctionnelles via Vercel
- permettre un déploiement standardisé via Docker

<p align="right">(<a href="#readme-top">retour en haut</a>)</p>

### 🛠️ Construit avec

L'interface s'appuie sur des briques modernes et robustes :

* [![Angular][Angular-Badge]][Angular-url]
* [![TypeScript][TypeScript-Badge]][TypeScript-url]
* [![PrimeNG][PrimeNG-Badge]][PrimeNG-url]
* [![TailwindCSS][Tailwind-Badge]][Tailwind-url]

<p align="right">(<a href="#readme-top">retour en haut</a>)</p>

## 🚀 Pour Commencer

Le projet peut être exécuté soit en mode développement Angular, soit avec Docker en mode développement, soit sous forme d'image Docker pour reproduire un environnement proche de la production.

### Prérequis

Pour être en mesure d'exécuter et développer sur le projet, veuillez installer :
* [Node.js 22+](https://nodejs.org/)
* [npm](https://www.npmjs.com/)
* [Angular CLI](https://angular.dev/tools/cli)
* [Docker](https://docs.docker.com/engine/install/)

### Installation et Déploiement

La configuration permet un lancement simple en local, ainsi qu'une exécution conteneurisée avec Docker.

#### Option 1 : Mode Développeur (Angular CLI)

1. Clonez le dépôt
   ```sh
   git clone https://github.com/gadnyz/smart-campus-front-end.git
   cd smart-campus-front-end
   ```
2. Installez les dépendances
   ```sh
   npm install
   ```
3. Lancez l'application
   ```sh
   npm start
   ```
4. L'application est désormais accessible sur :
   - [http://localhost:4200](http://localhost:4200)

#### Option 2 : Exécution avec Docker

1. Construisez l'image Docker
   ```sh
   docker build -t smart-campus:local .
   ```
2. Lancez le conteneur
   ```sh
   docker run -d -p 8080:80 --name smart-campus-app smart-campus:local
   ```
3. L'application est désormais accessible sur :
   - [http://localhost:8080](http://localhost:8080)

4. Arrêter puis le supprimer le conteneur  :
   ```sh
   docker stop smart-campus-app
   docker rm smart-campus-app
   ```
#### Option 3 : Développement avec Docker

1. Lancez l'environnement de développement conteneurisé
   ```sh
   docker compose -f docker-compose.dev.yml up --build
   ```
2. L'application est accessible sur :
   - [http://localhost:4200](http://localhost:4200)
3. Pour arrêter l'environnement :
   ```sh
   docker compose -f docker-compose.dev.yml down
   ```

<p align="right">(<a href="#readme-top">retour en haut</a>)</p>

## 🏗️ Architecture et Normes

Le projet est configuré avec les principes suivants pour standardiser le développement :

- 📦 **Structuration Angular claire** : organisation par pages, composants et services.
- 🎨 **Interface moderne** : intégration de PrimeNG et Tailwind CSS pour accélérer la construction de l'UI.
- ✅ **Qualité de code** : contrôle statique via ESLint.
- 🐳 **Conteneurisation standard** : build Angular avec Node.js et service des fichiers via Nginx.
- 🔒 **Intégration contrôlée** : aucune fusion vers `develop` ou `main` sans validation CI.

Règles recommandées :
- toute évolution passe par Pull Request
- aucun push direct sur les branches protégées
- les contrôles `lint` et `build:prod` doivent être validés avant merge

<p align="right">(<a href="#readme-top">retour en haut</a>)</p>


## 📦 Compilation

Pour construire l'application en mode production :
```sh
npm run build:prod
```

Les fichiers générés sont disponibles dans :
```sh
dist/smart-campus
```

Le projet expose également un `Dockerfile` multi-stage s'appuyant sur `node:22-alpine` pour le build et `nginx:alpine` pour le service des fichiers statiques, permettant d'obtenir une image légère et adaptée aux déploiements.

Pour le développement conteneurisé, le projet expose également un `Dockerfile.dev` et un `docker-compose.dev.yml` permettant de lancer `ng serve` dans Docker avec montage du code source et rechargement automatique.

<p align="right">(<a href="#readme-top">retour en haut</a>)</p>

[Angular-Badge]: https://img.shields.io/badge/Angular-21-DD0031?style=for-the-badge&logo=angular&logoColor=white
[Angular-url]: https://angular.dev/
[TypeScript-Badge]: https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white
[TypeScript-url]: https://www.typescriptlang.org/
[PrimeNG-Badge]: https://img.shields.io/badge/PrimeNG-007ACC?style=for-the-badge&logo=primeng&logoColor=white
[PrimeNG-url]: https://primeng.org/
[Tailwind-Badge]: https://img.shields.io/badge/TailwindCSS-38BDF8?style=for-the-badge&logo=tailwind-css&logoColor=white
[Tailwind-url]: https://tailwindcss.com/
[Docker-Badge]: https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white
[Docker-url]: https://www.docker.com/
[Nginx-Badge]: https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white
[Nginx-url]: https://nginx.org/
