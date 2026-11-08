#!/usr/bin/env node
// Seeder idempotent des candidats de démonstration 2026-2027 (voir docs/DONNEES_REFERENCE.md).
// Prérequis : npm run seed:fsi puis npm run seed:structure (facultés, programmes, année active).
// ⚠️ Chaque création envoie un e-mail (mot de passe du compte candidat), chaque validation/rejet aussi.
//   npm run seed:candidats             # import
//   npm run seed:candidats -- --check  # simulation
import path from 'node:path';
import { CHECK, create, eq, isFake, listAll, login, mutate, printStats, readCsv, stats } from './lib/smartcampus-api.mjs';

const FILE = path.resolve(import.meta.dirname, '../database/seed-data/candidats-2026-2027/candidats.csv');
const FINAL = new Set(['VALIDATED', 'REJECTED']);

async function main() {
    const rows = readCsv(FILE);
    const emails = new Set();
    for (const r of rows) {
        if (emails.has(r.email)) throw new Error(`Adresse en double : ${r.email}`);
        emails.add(r.email);
        if (!['DRAFT', 'PENDING', 'VALIDATED', 'REJECTED'].includes(r.statut_vise)) throw new Error(`${r.ref} : statut inconnu ${r.statut_vise}`);
        if (r.statut_vise === 'REJECTED' && !r.motif_rejet) throw new Error(`${r.ref} : motif de rejet manquant`);
    }
    console.log(`[données] ${rows.length} candidats`);
    await login();

    const faculties = await listAll('/api/v1/faculties');
    const programs = await listAll('/api/v1/programs');
    const existing = await listAll('/api/v1/candidates');
    const notes = [];

    for (const r of rows) {
        const faculty = faculties.find((f) => eq(f.code, r.faculte));
        const program = programs.find((p) => eq(p.code, r.programme));
        const pl = program?.levels.find((l) => eq(l.level.code, r.niveau));
        if (!faculty || !program || !pl || program.faculty_id !== faculty.id) throw new Error(`${r.ref} : ${r.faculte}/${r.programme}/${r.niveau} introuvable (lancer npm run seed:structure)`);

        let candidate = existing.find((c) => eq(c.email, r.email));
        if (candidate) stats.kept++;
        else {
            candidate = await create('candidat', `${r.ref} ${r.email}`, '/api/v1/candidates', {
                faculty_id: faculty.id, program_id: program.id, level_id: pl.level.id,
                first_name: r.prenom, last_name: r.nom, middle_name: r.postnom,
                gender: r.genre, birth_date: r.date_naissance, birth_place: r.lieu_naissance,
                marital_status: r.etat_civil, nationality: r.nationalite, email: r.email, phone: r.telephone,
                origin: { province: r.province },
                tutor: { full_name: r.tuteur_nom, phone: r.tuteur_telephone, profession: r.tuteur_profession },
                emergency_contact: { full_name: r.urgence_nom, phone: r.urgence_telephone, relationship: r.urgence_relation },
                academic_background: {
                    school_name: r.ecole, option: r.option, percentage: Number(r.pourcentage), graduation_year: Number(r.annee_diplome),
                    study_country: r.pays_etudes, study_city: r.ville_etudes
                },
                candidature: { type: r.type }
            });
        }

        const status = candidate.candidature?.status ?? 'DRAFT';
        if (status === r.statut_vise || isFake(candidate.id) && !FINAL.has(r.statut_vise)) continue;
        if (r.statut_vise === 'VALIDATED' && !FINAL.has(status)) await mutate(`${r.ref} validé`, `/api/v1/candidates/${candidate.id}/validate`, 'POST');
        else if (r.statut_vise === 'REJECTED' && !FINAL.has(status)) await mutate(`${r.ref} rejeté`, `/api/v1/candidates/${candidate.id}/reject`, 'POST', { reason: r.motif_rejet });
        else if (r.statut_vise === 'PENDING' && status === 'DRAFT') notes.push(`${r.ref} reste en brouillon : le statut « en attente » n'est atteint qu'au premier document déposé`);
        else if (status !== r.statut_vise) { notes.push(`${r.ref} : statut ${status} en base, ${r.statut_vise} attendu (non modifiable automatiquement)`); process.exitCode = 1; }
    }

    if (!CHECK) {
        await new Promise((res) => setTimeout(res, 3000)); // création des étudiants : traitement asynchrone (événements)
        const after = await listAll('/api/v1/candidates');
        const ours = after.filter((c) => emails.has(c.email.toLowerCase()));
        const byStatus = ours.reduce((a, c) => ({ ...a, [c.candidature?.status]: (a[c.candidature?.status] || 0) + 1 }), {});
        const students = (await listAll('/api/v1/students')).filter((s) => emails.has(String(s.email).toLowerCase()));
        console.log('\n[contrôle] candidats par statut :', byStatus);
        console.log(`[contrôle] étudiants créés : ${students.length} (attendu ${rows.filter((r) => r.statut_vise === 'VALIDATED').length})`);
    }
    for (const n of notes) console.log(`[note] ${n}`);
    printStats();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
