#!/usr/bin/env node
// Réinitialisation complète de la base de développement (voir docs/DONNEES_REFERENCE.md).
//   1. sauvegarde horodatée dans backups/ (dump PostgreSQL + données MinIO)
//   2. arrêt du backend, suppression/recréation de la base, vidage MinIO et Redis
//   3. redémarrage du backend : Liquibase recrée le schéma, SecurityDatabaseSeeder recrée privilèges, rôles, profils et admin
//   4. contrôle : l'admin se connecte et il est le seul utilisateur
//   5. (option --seed) import FSI, structure UNH, salles et horaires ; (option --candidats) candidats de démonstration
//
//   $env:SMARTCAMPUS_API_PASSWORD = '<mot de passe admin>'
//   npm run db:reset -- --dry-run          # affiche les étapes, ne touche à rien
//   npm run db:reset -- --yes --seed       # réinitialise puis importe la FSI
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = new Set(process.argv.slice(2));
const DRY = args.has('--dry-run');
const ROOT = path.resolve(import.meta.dirname, '..');
const C = {
    backend: process.env.SC_BACKEND_CONTAINER || 'smart-campus-backend',
    postgres: process.env.SC_POSTGRES_CONTAINER || 'smart-campus-postgres',
    minio: process.env.SC_MINIO_CONTAINER || 'smart-campus-minio',
    redis: process.env.SC_REDIS_CONTAINER || 'smart-campus-redis'
};
const API = process.env.SMARTCAMPUS_API_URL || 'http://localhost:8085';
const ADMIN = process.env.SMARTCAMPUS_API_USERNAME || 'admin@smart-campus.org';
const PASSWORD = process.env.SMARTCAMPUS_API_PASSWORD;

function run(cmd, cmdArgs, { capture = false, mutating = true } = {}) {
    const shown = `${cmd} ${cmdArgs.join(' ')}`.replace(/(PASSWORD=|-a |requirepass )\S+/g, '$1***').replace(/(\/\/[^:/]+:)[^@]+@/g, '$1***@');
    if (DRY && mutating) { console.log(`[simulation] ${shown}`); return ''; }
    const r = spawnSync(cmd, cmdArgs, { encoding: 'utf8', stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit', env: { ...process.env, MSYS_NO_PATHCONV: '1' } });
    if (r.status !== 0) throw new Error(`Échec : ${shown}\n${r.stderr || ''}`);
    return (r.stdout || '').trim();
}
const containerEnv = (container, key) => {
    const line = run('docker', ['inspect', container, '--format', '{{range .Config.Env}}{{println .}}{{end}}'], { capture: true, mutating: false })
        .split(/\r?\n/).find((l) => l.startsWith(`${key}=`));
    if (!line) throw new Error(`Variable ${key} introuvable dans le conteneur ${container}`);
    return line.slice(key.length + 1);
};
const network = () => run('docker', ['inspect', C.backend, '--format', '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}'], { capture: true, mutating: false });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitHealthy() {
    for (let i = 0; i < 60; i++) {
        try { if ((await fetch(`${API}/actuator/health`)).ok) return; } catch { /* backend pas encore prêt */ }
        await sleep(5000);
    }
    throw new Error('Le backend ne répond pas après 5 minutes');
}

async function main() {
    if (!DRY && !args.has('--yes')) throw new Error('Opération destructive : relancer avec --yes (ou --dry-run pour simuler).');
    if (!PASSWORD) throw new Error("Variable SMARTCAMPUS_API_PASSWORD absente (mot de passe de l'admin).");
    for (const c of Object.values(C)) run('docker', ['inspect', c, '--format', '{{.Name}}'], { capture: true, mutating: false });

    const pgUser = containerEnv(C.postgres, 'POSTGRES_USER');
    const pgDb = containerEnv(C.postgres, 'POSTGRES_DB');
    const minioUser = containerEnv(C.minio, 'MINIO_ROOT_USER');
    const minioPass = containerEnv(C.minio, 'MINIO_ROOT_PASSWORD');
    const redisPass = containerEnv(C.redis, 'REDIS_PASSWORD');

    // 1. Sauvegarde
    const stamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '');
    const dir = path.join(ROOT, 'backups', stamp);
    console.log(`[1/5] sauvegarde -> ${path.relative(ROOT, dir)}`);
    if (!DRY) fs.mkdirSync(dir, { recursive: true });
    run('docker', ['exec', C.postgres, 'pg_dump', '-U', pgUser, '-d', pgDb, '-Fc', '-f', '/tmp/reset-backup.dump']);
    run('docker', ['cp', `${C.postgres}:/tmp/reset-backup.dump`, path.join(dir, `${pgDb}.dump`)]);
    run('docker', ['exec', C.postgres, 'rm', '/tmp/reset-backup.dump']);
    run('docker', ['cp', `${C.minio}:/minio/data`, path.join(dir, 'minio-data')]);
    if (!DRY && fs.statSync(path.join(dir, `${pgDb}.dump`)).size === 0) throw new Error('Dump vide : arrêt avant toute suppression');

    // 2. Suppression
    console.log('[2/5] arrêt du backend, recréation de la base, vidage MinIO et Redis');
    run('docker', ['stop', C.backend]);
    run('docker', ['exec', C.postgres, 'psql', '-U', pgUser, '-d', 'postgres', '-c', `DROP DATABASE ${pgDb} WITH (FORCE);`, '-c', `CREATE DATABASE ${pgDb} OWNER ${pgUser};`]);
    run('docker', ['run', '--rm', '--network', network(), '-e', `MC_HOST_l=http://${minioUser}:${minioPass}@${C.minio}:9000`, '--entrypoint', 'sh', 'quay.io/minio/mc', '-c',
        'for b in $(mc ls l | awk \'{print $NF}\'); do mc rm --recursive --force "l/$b" >/dev/null 2>&1 || true; done']);
    run('docker', ['exec', C.redis, 'redis-cli', '-a', redisPass, '--no-auth-warning', 'FLUSHALL']);

    // 3. Redémarrage
    console.log('[3/5] redémarrage du backend (migrations Liquibase + seeder de sécurité)');
    run('docker', ['start', C.backend]);
    if (!DRY) await waitHealthy();

    // 4. Contrôle de l'admin
    console.log("[4/5] contrôle de l'admin");
    if (!DRY) {
        const login = await fetch(`${API}/api/v1/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: ADMIN, password: PASSWORD }) });
        if (!login.ok) throw new Error(`Connexion admin impossible (${login.status})`);
        const users = run('docker', ['exec', C.postgres, 'psql', '-U', pgUser, '-d', pgDb, '-At', '-c', 'select count(*) from users'], { capture: true, mutating: false });
        if (users !== '1') throw new Error(`${users} utilisateurs après reset (attendu : 1)`);
        console.log('      admin OK, seul utilisateur en base');
    }

    // 5. Import optionnel : référentiel FSI, structure UNH, salles et horaires ; candidats seulement avec --candidats (envoie des e-mails)
    if (args.has('--seed')) {
        const seeders = ['seed-fsi.mjs', 'seed-structure.mjs', 'seed-fsi-timetables.mjs', ...(args.has('--candidats') ? ['seed-candidates.mjs'] : [])];
        for (const s of seeders) {
            console.log(`[5/5] ${s}`);
            run(process.execPath, [path.join(ROOT, 'tools', s), ...(DRY ? ['--check'] : [])], { mutating: false });
        }
    } else console.log('[5/5] import non demandé (ajouter --seed, et --candidats pour les candidats)');
}

main().catch((e) => { console.error(`ERREUR : ${e.message}`); process.exit(1); });
