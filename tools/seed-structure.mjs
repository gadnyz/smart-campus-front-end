#!/usr/bin/env node
// Seeder idempotent de la structure de l'UNH : niveaux, facultés, programmes (voir docs/DONNEES_REFERENCE.md).
//   npm run seed:structure            # import
//   npm run seed:structure -- --check # simulation
import path from 'node:path';
import { CHECK, create, eq, listAll, login, mutate, printStats, readCsv, stats } from './lib/smartcampus-api.mjs';

const FILE = path.resolve(import.meta.dirname, '../database/seed-data/structure/facultes_programmes.csv');

// Ordre global des niveaux (décision 2026-11-08 : Prépa avant L1).
export const LEVELS = [
    { code: 'PREPA', name: 'Préparatoire', order: 1 },
    { code: 'L1', name: 'Licence 1', order: 2 },
    { code: 'L2', name: 'Licence 2', order: 3 },
    { code: 'L3', name: 'Licence 3', order: 4 },
    { code: 'L4', name: 'Licence 4', order: 5 },
    { code: 'M1', name: 'Master 1', order: 6 },
    { code: 'M2', name: 'Master 2', order: 7 }
];

async function main() {
    const rows = readCsv(FILE);
    const errors = [];
    const codes = new Set(LEVELS.map((l) => l.code));
    const seen = new Set();
    for (const r of rows) {
        for (const l of [...r.niveaux.split(','), ...(r.niveaux_tronc_commun ? r.niveaux_tronc_commun.split(',') : [])]) if (!codes.has(l)) errors.push(`${r.programme_code} : niveau inconnu ${l}`);
        if (seen.has(r.programme_code)) errors.push(`programme en double : ${r.programme_code}`);
        seen.add(r.programme_code);
    }
    if (errors.length) throw new Error(`Données invalides :\n - ${errors.join('\n - ')}`);
    const faculties = [...new Map(rows.map((r) => [r.faculte_code, r.faculte_nom])).entries()];
    console.log(`[données] ${faculties.length} facultés, ${rows.length} programmes`);

    await login();

    // Niveaux : création et ordre
    const existingLevels = await listAll('/api/v1/levels');
    const levelId = {};
    for (const l of LEVELS) {
        const found = existingLevels.find((x) => eq(x.code, l.code));
        if (!found) { levelId[l.code] = (await create('niveau', l.code, '/api/v1/levels', l)).id; continue; }
        levelId[l.code] = found.id;
        stats.kept++;
        if (found.name !== l.name) await mutate(`niveau ${l.code} : nom « ${found.name} » -> « ${l.name} »`, `/api/v1/levels/${found.id}`, 'PUT', { code: l.code, name: l.name });
        // L'API ne permet pas de changer l'ordre (UpdateLevelRequest sans « order ») : écart signalé, correction manuelle (voir DONNEES_REFERENCE.md)
        if (found.level_order !== l.order) { console.warn(`[écart] niveau ${l.code} : ordre ${found.level_order} en base, ${l.order} attendu`); process.exitCode = 1; }
    }

    // Facultés
    const existingFaculties = await listAll('/api/v1/faculties');
    const facultyId = {};
    for (const [code, name] of faculties) {
        const found = existingFaculties.find((x) => eq(x.code, code));
        if (found) { stats.kept++; facultyId[code] = found.id; continue; }
        facultyId[code] = (await create('faculté', `${code} (${name})`, '/api/v1/faculties', { code, name })).id;
    }

    // Programmes
    const existingPrograms = await listAll('/api/v1/programs');
    for (const r of rows) {
        const common = new Set(r.niveaux_tronc_commun ? r.niveaux_tronc_commun.split(',') : []);
        const levels = r.niveaux.split(',').map((c) => ({ level_id: levelId[c], is_common: common.has(c) }));
        const found = existingPrograms.find((x) => eq(x.code, r.programme_code));
        if (!found) {
            await create('programme', `${r.programme_code} (${r.programme_nom})`, '/api/v1/programs', { code: r.programme_code, name: r.programme_nom, faculty_id: facultyId[r.faculte_code], levels });
            continue;
        }
        stats.kept++;
        const actual = (found.levels || []).map((pl) => `${pl.level.code}:${pl.is_common}`).sort().join(',');
        const wanted = r.niveaux.split(',').map((c) => `${c}:${common.has(c)}`).sort().join(',');
        if (actual !== wanted) console.warn(`[écart] ${r.programme_code} : niveaux en base ${actual} ≠ fichier ${wanted} (non modifié automatiquement)`);
    }

    // Contrôle
    if (!CHECK) {
        const programs = await listAll('/api/v1/programs');
        const facs = await listAll('/api/v1/faculties');
        console.log('\n[contrôle] programmes par faculté');
        for (const f of facs) {
            const ps = programs.filter((p) => p.faculty_id === f.id);
            const expected = rows.filter((r) => r.faculte_code === f.code).length;
            console.log(`  ${f.code.padEnd(6)} ${String(ps.length).padStart(2)} programme(s) (attendu ${expected}) ${ps.length === expected ? 'OK' : '<-- ÉCART'}`);
            if (ps.length !== expected) process.exitCode = 1;
        }
        const lv = await listAll('/api/v1/levels');
        console.log('[contrôle] niveaux :', lv.sort((a, b) => a.level_order - b.level_order).map((l) => `${l.code}=${l.level_order}`).join(' '));
    }
    printStats();
}
main().catch((e) => { console.error(e.message); process.exit(1); });
