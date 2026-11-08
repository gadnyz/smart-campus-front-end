#!/usr/bin/env node
// Seeder idempotent des données de référence FSI 2026-2027 (voir docs/DONNEES_REFERENCE.md).
// Passe par l'API REST : chaque objet est recherché avant d'être créé, la commande peut être relancée sans doublon.
//
//   $env:SMARTCAMPUS_API_PASSWORD = '<mot de passe admin>'   # jamais écrit dans le code
//   npm run seed:fsi             # import
//   npm run seed:fsi -- --check  # simulation, aucune écriture
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(import.meta.dirname, '../database/seed-data/fsi-2026-2027');
const BASE_URL = process.env.SMARTCAMPUS_API_URL || 'http://localhost:8085';
const USERNAME = process.env.SMARTCAMPUS_API_USERNAME || 'admin@smart-campus.org';
const PASSWORD = process.env.SMARTCAMPUS_API_PASSWORD;
const CHECK = process.argv.includes('--check');
const EMAIL_DOMAIN = 'unhorizon.org';

// ---------- Référentiel (décisions du 2026-11-08) ----------
const FACULTY = { code: 'FSI', name: 'Faculté des Sciences Informatiques' };
// Même ordre que tools/seed-structure.mjs (Prépa ajouté le 2026-11-08)
const LEVELS = [
    { code: 'PREPA', name: 'Préparatoire', order: 1 },
    { code: 'L1', name: 'Licence 1', order: 2 },
    { code: 'L2', name: 'Licence 2', order: 3 },
    { code: 'L3', name: 'Licence 3', order: 4 },
    { code: 'L4', name: 'Licence 4', order: 5 },
    { code: 'M1', name: 'Master 1', order: 6 },
    { code: 'M2', name: 'Master 2', order: 7 }
];
// parcours = code utilisé dans fsi_maquette.csv / fsi_affectations.csv
const PROGRAMS = [
    { parcours: 'TC', code: 'FSI-TC', name: 'Sciences Informatiques (tronc commun)', levels: ['L1', 'L2'], common: true },
    { parcours: 'GL', code: 'FSI-GL', name: 'Génie Logiciel', levels: ['L3', 'L4'] },
    { parcours: 'SI', code: 'FSI-SI', name: 'Systèmes Informatiques', levels: ['L3', 'L4'] },
    { parcours: 'IA', code: 'FSI-IA', name: 'Intelligence Artificielle', levels: ['L3', 'L4'] },
    { parcours: null, code: 'FSI-MIL', name: 'Master Ingénierie Logicielle', levels: ['M1', 'M2'] },
    { parcours: null, code: 'FSI-MCS', name: 'Master Cybersécurité', levels: ['M1', 'M2'] }
];
const ACADEMIC_YEAR = { label: '2026-2027', start_date: '2026-10-15', end_date: '2027-10-14' };
const SEMESTERS = [
    { code: 'S1', name: 'Semestre 1 (S1, S3, S5, S7)', semester_order: 1, start_date: '2026-10-15', end_date: '2027-02-28' },
    { code: 'S2', name: 'Semestre 2 (S2, S4, S6, S8)', semester_order: 2, start_date: '2027-03-01', end_date: '2027-10-14' }
];
// Harmonisation des majuscules (seule la première lettre en majuscule)
const UE_TITLE_FIX = {
    AMP1231: 'Algorithmique et méthodes de programmation',
    CLO1231: 'Circuits logiques',
    TBD1351: 'Techniques de base de données'
};
const EC_TITLE_FIX = {
    'DRC1121-EC1': 'Droit civil et législation sociale',
    'AMP1231-EC1': 'Algorithmique et méthodes de programmation',
    'TBD1351-EC1': 'Techniques de base de données'
};
const FORBIDDEN_EMAIL = /(^|[.@])(test|demo|user\d*|john\.doe|lorem)([.@]|$)/i;

// ---------- Lecture et nettoyage ----------
const clean = (v) => (v ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
function readCsv(file) {
    const [header, ...lines] = fs.readFileSync(path.join(DATA_DIR, file), 'utf8').replace(/^﻿/, '').trim().split(/\r?\n/);
    const keys = header.split(';').map(clean);
    return lines.filter((l) => l.trim()).map((l) => Object.fromEntries(l.split(';').map((v, i) => [keys[i], clean(v)])));
}
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const grades = readCsv('fsi_grades.csv');
const teachers = readCsv('fsi_enseignants.csv');
const complements = Object.fromEntries(readCsv('fsi_enseignants_complements.csv').map((r) => [r.id_enseignant, r]));
const ues = readCsv('fsi_ue.csv');
const ecs = readCsv('fsi_ec.csv');
const maquette = readCsv('fsi_maquette.csv');
const assignments = readCsv('fsi_affectations.csv');
const blocs = Object.fromEntries(readCsv('fsi_blocs.csv').map((r) => [r.code_ue, r.bloc]));

function personOf(t) {
    const parts = t.nom_complet.split(' ');
    const lastName = parts.pop();
    const firstName = parts.join(' ');
    const email = `${slug(firstName)}.${slug(lastName)}@${EMAIL_DOMAIN}`;
    return { firstName, lastName, email };
}

function validate() {
    const errors = [];
    const ueByCode = Object.fromEntries(ues.map((u) => [u.code_ue, u]));
    const ecByCode = Object.fromEntries(ecs.map((e) => [e.code_ec, e]));
    const teacherIds = new Set(teachers.map((t) => t.id_enseignant));
    const gradeCodes = new Set(grades.map((g) => g.grade_code));
    for (const e of ecs) if (!ueByCode[e.code_ue]) errors.push(`EC ${e.code_ec} : UE ${e.code_ue} inconnue`);
    for (const u of ues) if (!blocs[u.code_ue]) errors.push(`UE ${u.code_ue} : bloc de compétences manquant`);
    for (const m of maquette) {
        if (!ueByCode[m.code_ue]) errors.push(`maquette : UE ${m.code_ue} inconnue`);
        if (!PROGRAMS.some((p) => p.parcours === m.parcours)) errors.push(`maquette : parcours ${m.parcours} inconnu`);
    }
    for (const a of assignments) {
        if (!ecByCode[a.code_ec]) errors.push(`affectation : EC ${a.code_ec} inconnue`);
        if (!teacherIds.has(a.id_enseignant)) errors.push(`affectation : enseignant ${a.id_enseignant} inconnu`);
        if (!['Titulaire', 'Assistant'].includes(a.role)) errors.push(`affectation : rôle ${a.role} inconnu`);
    }
    const emails = new Map();
    for (const t of teachers) {
        if (!gradeCodes.has(t.grade_code)) errors.push(`${t.id_enseignant} : grade ${t.grade_code} inconnu`);
        const c = complements[t.id_enseignant];
        if (!c || !c.genre || !c.date_naissance || !c.lieu_naissance || !c.etat_civil || !c.nationalite || !c.telephone) errors.push(`${t.id_enseignant} : compléments manquants`);
        const { email } = personOf(t);
        if (FORBIDDEN_EMAIL.test(email)) errors.push(`${t.id_enseignant} : adresse interdite ${email}`);
        if (emails.has(email)) errors.push(`collision d'adresse ${email} : ${emails.get(email)} / ${t.nom_complet}`);
        emails.set(email, t.nom_complet);
    }
    // 30 crédits par parcours et par semestre
    const credits = {};
    for (const m of maquette) credits[`${m.parcours} ${m.semestre}`] = (credits[`${m.parcours} ${m.semestre}`] || 0) + Number(ueByCode[m.code_ue]?.credits || 0);
    for (const [k, v] of Object.entries(credits)) if (v !== 30) errors.push(`${k} : ${v} crédits au lieu de 30`);
    if (errors.length) throw new Error(`Données invalides :\n - ${errors.join('\n - ')}`);
    console.log(`[données] ${ues.length} UE, ${ecs.length} EC, ${teachers.length} enseignants, ${maquette.length} lignes de maquette, ${assignments.length} affectations — contrôles OK`);
}

// ---------- Client API ----------
class HttpError extends Error {
    constructor(message, status, payload) { super(message); this.status = status; this.payload = payload; }
}
let token = null;
async function api(p, { method = 'GET', body, query } = {}) {
    const url = new URL(BASE_URL + p);
    for (const [k, v] of Object.entries(query || {})) url.searchParams.set(k, String(v));
    for (let attempt = 1; ; attempt++) {
        const res = await fetch(url, {
            method,
            headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: body ? JSON.stringify(body) : undefined
        });
        const text = await res.text();
        let payload = null;
        try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
        if (res.status === 429 && attempt < 6) {
            console.warn(`[attente] limite de débit atteinte (${method} ${p}), nouvel essai dans 65 s`);
            await new Promise((r) => setTimeout(r, 65000));
            continue;
        }
        if (!res.ok) throw new HttpError(`${method} ${p} -> ${res.status} ${JSON.stringify(payload)}`, res.status, payload);
        return payload;
    }
}
async function listAll(p) {
    const all = [];
    for (let page = 0; ; page++) {
        const r = await api(p, { query: { page, size: 100 } });
        if (Array.isArray(r)) return r;
        if (!r || !Array.isArray(r.content)) return all;
        all.push(...r.content);
        if (page + 1 >= (r.total_pages ?? r.totalPages ?? 1)) return all;
    }
}
const stats = { created: 0, kept: 0, updated: 0 };
const isFake = (id) => String(id).startsWith('check:');
async function create(label, identity, p, body) {
    if (CHECK) { console.log(`[simulation] créerait ${label} : ${identity}`); stats.created++; return { id: `check:${label}:${identity}`, ...body }; }
    const r = await api(p, { method: 'POST', body });
    console.log(`[créé] ${label} : ${identity}`); stats.created++;
    return r;
}
const keep = (label, identity, item) => { stats.kept++; if (process.argv.includes('--verbose')) console.log(`[existant] ${label} : ${identity}`); return item; };
const eq = (a, b) => String(a ?? '').toLowerCase() === String(b ?? '').toLowerCase();

// ---------- Import ----------
async function seed() {
    // Grades
    const existingGrades = await listAll('/api/v1/professor-grades');
    const gradeId = {};
    for (const g of grades) {
        const found = existingGrades.find((x) => eq(x.code, g.grade_code));
        gradeId[g.grade_code] = (found ? keep('grade', g.grade_code, found) : await create('grade', g.grade_code, '/api/v1/professor-grades', { code: g.grade_code, name: g.grade_libelle })).id;
    }
    // Niveaux
    const existingLevels = await listAll('/api/v1/levels');
    const levelId = {};
    for (const l of LEVELS) {
        const found = existingLevels.find((x) => eq(x.code, l.code));
        levelId[l.code] = (found ? keep('niveau', l.code, found) : await create('niveau', l.code, '/api/v1/levels', l)).id;
    }
    // Faculté
    const existingFaculties = await listAll('/api/v1/faculties');
    const faculty = existingFaculties.find((x) => eq(x.code, FACULTY.code)) ?? await create('faculté', FACULTY.code, '/api/v1/faculties', FACULTY);
    // Programmes et niveaux de programme
    const existingPrograms = isFake(faculty.id) ? [] : await listAll(`/api/v1/programs/faculty/${faculty.id}`);
    const programLevelId = {}; // `${parcours} ${niveau}` -> id
    for (const p of PROGRAMS) {
        let program = existingPrograms.find((x) => eq(x.code, p.code));
        const levels = p.levels.map((code) => ({ level_id: levelId[code], is_common: !!p.common }));
        if (program) {
            keep('programme', p.code, program);
            const missing = p.levels.filter((code) => !program.levels?.some((pl) => eq(pl.level?.code, code)));
            if (missing.length) throw new Error(`Le programme ${p.code} existe sans les niveaux ${missing.join(', ')} : à corriger manuellement`);
        } else {
            program = await create('programme', p.code, '/api/v1/programs', { code: p.code, name: p.name, faculty_id: faculty.id, levels });
        }
        for (const code of p.levels) {
            const pl = program.levels?.find((x) => eq(x.level?.code, code));
            if (p.parcours) programLevelId[`${p.parcours} ${code}`] = pl?.id ?? `check:pl:${p.code}-${code}`;
        }
    }
    // Année académique et semestres
    const years = await listAll('/api/v1/academic-years');
    const year = years.find((y) => eq(y.label, ACADEMIC_YEAR.label)) ?? await create('année académique', ACADEMIC_YEAR.label, '/api/v1/academic-years', ACADEMIC_YEAR);
    let current = null;
    try { current = await api('/api/v1/academic-years/current'); } catch (e) { if (!(e instanceof HttpError && e.status === 404)) throw e; }
    if (current?.id !== year.id) {
        if (CHECK) console.log(`[simulation] activerait l'année ${ACADEMIC_YEAR.label}`);
        else { await api(`/api/v1/academic-years/${year.id}/activate`, { method: 'PATCH' }); console.log(`[activé] année ${ACADEMIC_YEAR.label}`); stats.updated++; }
    }
    const existingSemesters = isFake(year.id) ? [] : await listAll(`/api/v1/semesters/academic-year/${year.id}`);
    for (const s of SEMESTERS) {
        const found = existingSemesters.find((x) => x.semester_order === s.semester_order);
        found ? keep('semestre', s.code, found) : await create('semestre', `${ACADEMIC_YEAR.label} ${s.code}`, '/api/v1/semesters', { ...s, academic_year_id: year.id });
    }
    // UE (une seule fois, rattachée à tous les niveaux de programme de la maquette)
    const existingUe = {};
    for (const plId of new Set(Object.values(programLevelId))) {
        if (isFake(plId)) continue;
        for (const u of await listAll(`/api/v1/course-units/program-level/${plId}`)) (existingUe[u.code.toUpperCase()] ??= { id: u.id, pls: new Map() }).pls.set(plId, u.knowledge_skills_bloc);
    }
    const ueId = {};
    for (const u of ues) {
        const pls = [...new Set(maquette.filter((m) => m.code_ue === u.code_ue).map((m) => programLevelId[`${m.parcours} ${u.niveau}`]))];
        const bloc = blocs[u.code_ue];
        const found = existingUe[u.code_ue.toUpperCase()];
        if (!found) {
            ueId[u.code_ue] = (await create('UE', u.code_ue, '/api/v1/course-units', { code: u.code_ue, knowledge_skills_bloc: bloc, program_level_ids: pls })).id;
            continue;
        }
        keep('UE', u.code_ue, found); ueId[u.code_ue] = found.id;
        for (const pl of pls) {
            const current = found.pls.get(pl);
            if (current === bloc) continue;
            const method = current ? 'PUT' : 'POST';
            if (CHECK) { console.log(`[simulation] ${method} UE ${u.code_ue} -> ${pl} (${bloc})`); continue; }
            await api(`/api/v1/course-units/${found.id}/program-levels/${pl}`, { method, body: { knowledge_skills_bloc: bloc } });
            console.log(`[maj] UE ${u.code_ue} : niveau de programme ${pl} (${bloc})`); stats.updated++;
        }
    }
    // EC -> cours
    const existingCourses = Object.fromEntries((await listAll('/api/v1/courses')).map((c) => [c.code.toUpperCase(), c]));
    const ueTitle = (u) => UE_TITLE_FIX[u.code_ue] ?? u.intitule;
    const courseId = {};
    for (const e of ecs) {
        const u = ues.find((x) => x.code_ue === e.code_ue);
        const found = existingCourses[e.code_ec.toUpperCase()];
        if (!found) {
            courseId[e.code_ec] = (await create('cours', e.code_ec, '/api/v1/courses', {
                code: e.code_ec,
                name: EC_TITLE_FIX[e.code_ec] ?? e.intitule,
                description: `UE ${u.code_ue} – ${ueTitle(u)}`,
                credits: Number(e.credits),
                course_unit_id: ueId[e.code_ue]
            })).id;
            continue;
        }
        keep('cours', e.code_ec, found); courseId[e.code_ec] = found.id;
        if (isFake(ueId[e.code_ue])) continue;
        const attached = await api(`/api/v1/course-units/${ueId[e.code_ue]}/courses`);
        if (!(attached || []).some((c) => c.course_id === found.id)) {
            if (CHECK) console.log(`[simulation] rattacherait ${e.code_ec} à ${e.code_ue}`);
            else { await api(`/api/v1/course-units/${ueId[e.code_ue]}/courses`, { method: 'POST', body: { course_id: found.id, credits: Number(e.credits) } }); console.log(`[maj] ${e.code_ec} rattaché à ${e.code_ue}`); stats.updated++; }
        }
    }
    // Enseignants (crée aussi leur compte utilisateur)
    const existingProfessors = Object.fromEntries((await listAll('/api/v1/professors')).map((p) => [p.email.toLowerCase(), p]));
    const professorId = {};
    for (const t of teachers) {
        const { firstName, lastName, email } = personOf(t);
        const c = complements[t.id_enseignant];
        const found = existingProfessors[email];
        professorId[t.id_enseignant] = (found ? keep('enseignant', email, found) : await create('enseignant', email, '/api/v1/professors', {
            faculty_id: faculty.id,
            professor_grade_id: gradeId[t.grade_code],
            first_name: firstName,
            last_name: lastName,
            middle_name: null,
            gender: c.genre,
            birth_date: c.date_naissance,
            birth_place: c.lieu_naissance,
            marital_status: c.etat_civil,
            nationality: c.nationalite,
            email,
            phone: c.telephone
        })).id;
    }
    // Affectations : union des parcours sur le cours unique (décision 2026-11-08)
    const wanted = new Map();
    for (const a of assignments) {
        const type = a.role === 'Titulaire' ? 'LEAD_INSTRUCTOR' : 'CO_INSTRUCTOR';
        wanted.set(`${a.code_ec}|${a.id_enseignant}|${type}`, { ec: a.code_ec, teacher: a.id_enseignant, type });
    }
    const byCourse = {};
    for (const w of wanted.values()) {
        const cid = courseId[w.ec], pid = professorId[w.teacher];
        if (!isFake(cid) && !(cid in byCourse)) {
            try { byCourse[cid] = await listAll(`/api/v1/course-assignments/course/${cid}`); } catch (e) { if (e.status === 404) byCourse[cid] = []; else throw e; }
        }
        const found = (byCourse[cid] || []).find((x) => x.professor_id === pid && x.academic_year_id === year.id && x.assignment_type === w.type);
        found ? keep('affectation', `${w.ec} ${w.teacher} ${w.type}`, found)
            : await create('affectation', `${w.ec} ${w.teacher} ${w.type}`, '/api/v1/course-assignments', { course_id: cid, professor_id: pid, academic_year_id: year.id, assignment_type: w.type });
    }
    console.log(`[affectations] ${wanted.size} affectations uniques (sur ${assignments.length} lignes source)`);
    return { faculty, year, programLevelId, ueId };
}

// ---------- Contrôles après import ----------
async function verify({ programLevelId }) {
    if (CHECK) return;
    console.log('\n[contrôle] crédits par niveau de programme (attendu : 60 = 2 semestres × 30)');
    let ok = true;
    for (const [key, plId] of Object.entries(programLevelId)) {
        const units = await listAll(`/api/v1/course-units/program-level/${plId}`);
        let total = 0;
        for (const u of units) for (const c of (await api(`/api/v1/course-units/${u.id}/courses`)) || []) total += c.credits;
        const expected = maquette.filter((m) => `${m.parcours} ${m.niveau}` === key).length;
        const good = total === 60 && units.length === expected;
        ok &&= good;
        console.log(`  ${key.padEnd(6)} ${String(units.length).padStart(2)} UE (attendu ${expected})  ${String(total).padStart(3)} crédits  ${good ? 'OK' : '<-- ÉCART'}`);
    }
    const counts = {
        programmes: (await listAll('/api/v1/programs')).length,
        cours: (await listAll('/api/v1/courses')).length,
        enseignants: (await listAll('/api/v1/professors')).length
    };
    console.log('[contrôle] comptages :', counts);
    if (!ok) process.exitCode = 1;
}

async function main() {
    if (!PASSWORD) throw new Error("Variable SMARTCAMPUS_API_PASSWORD absente (mot de passe de l'admin).");
    validate();
    token = (await api('/api/v1/auth/login', { method: 'POST', body: { email: USERNAME, password: PASSWORD } })).access_token;
    console.log(`[api] connecté à ${BASE_URL} en tant que ${USERNAME}${CHECK ? ' (SIMULATION)' : ''}`);
    const ctx = await seed();
    await verify(ctx);
    console.log(`\n[bilan] créés : ${stats.created}, existants : ${stats.kept}, mis à jour : ${stats.updated}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
