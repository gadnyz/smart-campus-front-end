#!/usr/bin/env node
// Import idempotent des salles et des horaires FSI (voir docs/DONNEES_REFERENCE.md).
// Prérequis : les données de référence sont importées (npm run seed:fsi).
//
//   $env:SMARTCAMPUS_API_PASSWORD = '<mot de passe admin>'
//   npm run seed:fsi:horaires                 # tous les fichiers de database/seed-data/fsi-2026-2027/horaires/
//   npm run seed:fsi:horaires -- --check      # simulation, aucune écriture
//   npm run seed:fsi:horaires -- --draft      # crée sans valider
import fs from 'node:fs';
import path from 'node:path';

const DATA = path.resolve(import.meta.dirname, '../database/seed-data/fsi-2026-2027');
const BASE_URL = process.env.SMARTCAMPUS_API_URL || 'http://localhost:8085';
const USERNAME = process.env.SMARTCAMPUS_API_USERNAME || 'admin@smart-campus.org';
const PASSWORD = process.env.SMARTCAMPUS_API_PASSWORD;
const CHECK = process.argv.includes('--check');
const VALIDATE = !process.argv.includes('--draft');
const PROGRAM_CODE = { TC: 'FSI-TC', GL: 'FSI-GL', SI: 'FSI-SI', IA: 'FSI-IA' };
const ACADEMIC_YEAR = '2026-2027';

const clean = (v) => (v ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
function readCsv(file) {
    const [h, ...lines] = fs.readFileSync(file, 'utf8').replace(/^﻿/, '').trim().split(/\r?\n/);
    const keys = h.split(';').map(clean);
    return lines.filter((l) => l.trim()).map((l) => Object.fromEntries(l.split(';').map((v, i) => [keys[i], clean(v)])));
}
const mondayOf = (iso) => {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    return d.toISOString().slice(0, 10);
};
const hms = (t) => (t.length === 5 ? `${t}:00` : t);

// ---------- API ----------
let token;
async function api(p, { method = 'GET', body, query } = {}) {
    const url = new URL(BASE_URL + p);
    for (const [k, v] of Object.entries(query || {})) url.searchParams.set(k, String(v));
    for (let attempt = 1; ; attempt++) {
        const res = await fetch(url, { method, headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
        const text = await res.text();
        let payload; try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
        if (res.status === 429 && attempt < 6) { console.warn('[attente] limite de débit, nouvel essai dans 65 s'); await new Promise((r) => setTimeout(r, 65000)); continue; }
        if (!res.ok) { const e = new Error(`${method} ${p} -> ${res.status} ${JSON.stringify(payload)}`); e.status = res.status; throw e; }
        return payload;
    }
}
async function listAll(p, query = {}) {
    const all = [];
    for (let page = 0; ; page++) {
        const r = await api(p, { query: { ...query, page, size: 100 } });
        if (Array.isArray(r)) return r;
        if (!r || !Array.isArray(r.content)) return all;
        all.push(...r.content);
        if (page + 1 >= (r.total_pages ?? 1)) return all;
    }
}
const stats = { created: 0, kept: 0, updated: 0 };
const log = (tag, msg) => console.log(`[${tag}] ${msg}`);

async function main() {
    if (!PASSWORD) throw new Error("Variable SMARTCAMPUS_API_PASSWORD absente (mot de passe de l'admin).");
    const rooms = readCsv(path.join(DATA, 'salles.csv'));
    const ecs = readCsv(path.join(DATA, 'fsi_ec.csv'));
    const teachers = readCsv(path.join(DATA, 'fsi_enseignants.csv'));
    const dir = path.join(DATA, 'horaires');
    const sessions = fs.readdirSync(dir).filter((f) => f.endsWith('.csv')).sort().flatMap((f) => readCsv(path.join(dir, f)).map((s) => ({ ...s, file: f })));

    // Contrôles des données avant tout appel
    const roomNames = new Set(rooms.map((r) => r.nom.toUpperCase()));
    const errors = [];
    for (const s of sessions) {
        if (!roomNames.has(s.salle_source.toUpperCase())) errors.push(`${s.file} ${s.date} : salle inconnue « ${s.salle_source} »`);
        if (!ecs.some((e) => e.code_ec === s.code_ec)) errors.push(`${s.file} ${s.date} : EC inconnue ${s.code_ec}`);
        if (!teachers.some((t) => t.id_enseignant === s.id_enseignant)) errors.push(`${s.file} ${s.date} : enseignant inconnu ${s.id_enseignant}`);
        if (s.debut >= s.fin) errors.push(`${s.file} ${s.date} : début >= fin`);
    }
    if (errors.length) throw new Error(`Données invalides :\n - ${errors.join('\n - ')}`);
    log('données', `${rooms.length} salles, ${sessions.length} séances`);

    token = (await api('/api/v1/auth/login', { method: 'POST', body: { email: USERNAME, password: PASSWORD } })).access_token;
    log('api', `connecté à ${BASE_URL}${CHECK ? ' (SIMULATION)' : ''}`);

    // Référentiel existant
    const year = (await listAll('/api/v1/academic-years')).find((y) => y.label === ACADEMIC_YEAR);
    if (!year) throw new Error(`Année ${ACADEMIC_YEAR} absente : lancer d'abord npm run seed:fsi`);
    const programs = await listAll('/api/v1/programs');
    const promo = (key) => {
        const [parcours, level] = key.split(' ');
        const program = programs.find((p) => p.code === PROGRAM_CODE[parcours]);
        const pl = program?.levels.find((l) => l.level.code === level);
        if (!pl) throw new Error(`Promotion inconnue : ${key}`);
        return { program, pl, key };
    };
    const professors = await listAll('/api/v1/professors');
    const teacherEmail = (id) => {
        const t = teachers.find((x) => x.id_enseignant === id);
        const parts = t.nom_complet.split(' ');
        const last = parts.pop();
        const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        return `${slug(parts.join(' '))}.${slug(last)}@unhorizon.org`;
    };
    const courses = await listAll('/api/v1/courses');
    const assignmentCache = {};
    async function assignmentFor(codeEc, teacherId) {
        const course = courses.find((c) => c.code === codeEc);
        const prof = professors.find((p) => p.email === teacherEmail(teacherId));
        assignmentCache[course.id] ??= await listAll(`/api/v1/course-assignments/course/${course.id}`);
        const list = assignmentCache[course.id].filter((a) => a.professor_id === prof.id && a.academic_year_id === year.id);
        const a = list.find((x) => x.assignment_type === 'LEAD_INSTRUCTOR') ?? list[0];
        if (!a) throw new Error(`Aucune affectation ${codeEc} / ${teacherId}`);
        return a.id;
    }

    // 1. Salles
    const existingRooms = await listAll('/api/v1/rooms');
    const roomId = {};
    for (const r of rooms) {
        const found = existingRooms.find((x) => x.name.toUpperCase() === r.nom.toUpperCase());
        if (found) { stats.kept++; roomId[r.nom.toUpperCase()] = found.id; continue; }
        const body = { name: r.nom, location: r.lieu, capacity: Number(r.capacite), type: r.type };
        if (CHECK) { log('simulation', `créerait la salle ${r.nom}`); roomId[r.nom.toUpperCase()] = `check:${r.nom}`; stats.created++; continue; }
        roomId[r.nom.toUpperCase()] = (await api('/api/v1/rooms', { method: 'POST', body })).id;
        log('créé', `salle ${r.nom} (${r.lieu})`); stats.created++;
    }

    // 2. Horaires (brouillons) : un par promotion et par semaine, hôte ou invitée
    const timetables = new Map(); // `${key}|${monday}` -> timetable
    for (const s of sessions) {
        const monday = mondayOf(s.date);
        for (const key of [s.promotion, ...(s.partage_avec ? s.partage_avec.split('|') : [])]) {
            const id = `${key}|${monday}`;
            if (timetables.has(id)) continue;
            const { program, pl } = promo(key);
            // Pas de filtre « week » : GET /timetables?week=… renvoie 500 côté backend (paramètre date non typé), filtrage local
            const found = (await listAll('/api/v1/timetables', { academic_year_id: year.id, program_level_id: pl.id }))
                .find((t) => t.program_level_id === pl.id && t.week_start === monday);
            if (found) { stats.kept++; timetables.set(id, found); continue; }
            const body = {
                academic_year_id: year.id, program_level_id: pl.id, week_start: monday,
                program_level_name: pl.level.name, program_id: program.id, program_name: program.name,
                faculty_id: program.faculty_id, faculty_name: program.faculty_name
            };
            if (CHECK) { log('simulation', `créerait l'horaire ${key} semaine du ${monday}`); timetables.set(id, { id: `check:${id}`, status: 'DRAFT' }); stats.created++; continue; }
            timetables.set(id, await api('/api/v1/timetables', { method: 'POST', body }));
            log('créé', `horaire ${key} semaine du ${monday}`); stats.created++;
        }
    }

    // 3. Séances, regroupées par horaire hôte (une requête par horaire, validée en bloc côté serveur)
    const byHost = new Map();
    for (const s of sessions) {
        const id = `${s.promotion}|${mondayOf(s.date)}`;
        if (!byHost.has(id)) byHost.set(id, []);
        byHost.get(id).push(s);
    }
    for (const [id, list] of byHost) {
        const tt = timetables.get(id);
        const existing = String(tt.id).startsWith('check:') ? [] : await api(`/api/v1/timetable-entries/timetable/${tt.id}`);
        const todo = [];
        for (const s of list) {
            const course = courses.find((c) => c.code === s.code_ec);
            const dup = (existing || []).find((e) => e.date === s.date && e.start_hour.slice(0, 5) === s.debut && e.course_id === course.id);
            if (dup) { stats.kept++; continue; }
            if (tt.status === 'VALIDATED') throw new Error(`Horaire ${id} déjà validé : séance ${s.date} ${s.code_ec} non ajoutée (repasser en brouillon d'abord)`);
            todo.push({
                date: s.date, start_hour: hms(s.debut), end_hour: hms(s.fin),
                room_id: roomId[s.salle_source.toUpperCase()],
                course_assignment_id: await assignmentFor(s.code_ec, s.id_enseignant),
                session_type: 'LECTURE', // la colonne « remarque » est interne : jamais envoyée comme note visible
                shared_with_program_level_ids: s.partage_avec ? s.partage_avec.split('|').map((k) => promo(k).pl.id) : []
            });
        }
        if (!todo.length) continue;
        if (CHECK) { log('simulation', `créerait ${todo.length} séance(s) dans ${id}`); stats.created += todo.length; continue; }
        const created = await api('/api/v1/timetable-entries', { method: 'POST', body: { timetable_id: tt.id, entries: todo } });
        const items = Array.isArray(created) ? created : created?.entries ?? created?.content ?? [];
        const warnings = items.flatMap((e) => e.warnings || []);
        log('créé', `${todo.length} séance(s) dans ${id}${warnings.length ? ` — ${warnings.length} avertissement(s) : ${JSON.stringify(warnings)}` : ''}`);
        stats.created += todo.length;
    }

    // 4. Validation : DRAFT -> SUBMITTED -> VALIDATED (après toutes les séances, car une séance partagée se verrouille)
    if (VALIDATE) {
        for (const [id, tt] of timetables) {
            const path = ['DRAFT', 'SUBMITTED', 'VALIDATED'];
            for (const next of path.slice(path.indexOf(tt.status) + 1)) {
                if (CHECK) { log('simulation', `passerait ${id} en ${next}`); continue; }
                await api(`/api/v1/timetables/${tt.id}/status`, { method: 'PATCH', body: { status: next } });
                tt.status = next; stats.updated++;
            }
            if (!CHECK) log('statut', `${id} : ${tt.status}`);
        }
    }

    // 5. Contrôle : nombre de séances visibles par promotion et par semaine
    if (!CHECK) {
        console.log('\n[contrôle] séances par horaire (hôte + partagées)');
        for (const [id, tt] of timetables) {
            const n = (await api(`/api/v1/timetable-entries/timetable/${tt.id}`))?.length ?? 0;
            const expected = sessions.filter((s) => `${s.promotion}|${mondayOf(s.date)}` === id || (s.partage_avec || '').split('|').some((k) => `${k}|${mondayOf(s.date)}` === id)).length;
            console.log(`  ${id.padEnd(18)} ${String(n).padStart(2)} séance(s) (attendu ${expected}) ${tt.status} ${n === expected ? 'OK' : '<-- ÉCART'}`);
            if (n !== expected) process.exitCode = 1;
        }
    }
    console.log(`\n[bilan] créés : ${stats.created}, existants : ${stats.kept}, transitions de statut : ${stats.updated}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
