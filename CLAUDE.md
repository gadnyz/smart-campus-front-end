# CLAUDE.md

Règles d'équipe (agents testeur, débogueur et relecteur) : voir [AGENTS.md](AGENTS.md).
Conventions d'architecture Angular : voir [conventions_architecturales.md](conventions_architecturales.md).

## Données de référence

Les données de la base de développement viennent des fichiers versionnés de `database/seed-data/`. Ne pas inventer de données.
Avant toute modification de données, lire **[docs/DONNEES_REFERENCE.md](docs/DONNEES_REFERENCE.md)** : sources, règles (e-mails `prenom.nom@unhorizon.org`, grades, dates de l'année 2026-2027), décisions prises, points en attente et procédure de réinitialisation.

- Réinitialiser la base et réimporter : `npm run db:reset -- --yes --seed` (avec `$env:SMARTCAMPUS_API_PASSWORD` défini). Toujours simuler d'abord avec `--dry-run`.
- Import seul, idempotent : `npm run seed:fsi`, ou `npm run seed:fsi:check` pour simuler.
- Structure UNH (8 facultés, 24 programmes) : `npm run seed:structure`. Candidats de démonstration (envoie des e-mails) : `npm run seed:candidats`.
- Salles et horaires (un CSV par semaine dans `database/seed-data/fsi-2026-2027/horaires/`) : `npm run seed:fsi:horaires`, ou `-- --check` pour simuler.
- Toute suppression demande l'accord explicite de l'utilisateur, et une sauvegarde dans `backups/` (ignoré par Git).
- Mettre à jour `docs/DONNEES_REFERENCE.md` à chaque changement de données ou de règles.
- L'ancien seeder `tools/seed-smart-campus.mjs` crée des données de démonstration fictives (comptes `@smart-campus.org` et `@example.com`, autres facultés) : ne pas l'utiliser sur cette base.
