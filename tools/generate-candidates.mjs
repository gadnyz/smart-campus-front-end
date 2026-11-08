#!/usr/bin/env node
// Génère, de façon déterministe, les 20 candidats de démonstration 2026-2027 (décisions du 2026-11-08,
// voir docs/DONNEES_REFERENCE.md). Personnes GÉNÉRÉES : aucun lien avec des personnes réelles.
// Relancer donne exactement le même fichier.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const OUT = path.resolve(import.meta.dirname, '../database/seed-data/candidats-2026-2027/candidats.csv');
const DOMAIN = 'unhorizon.org';

// Répartition validée : faculté, programme, niveau d'entrée, statut visé
const PLAN = [
    ['FSI', 'FSI-TC', 'L1', 'VALIDATED'], ['FSI', 'FSI-TC', 'L1', 'PENDING'], ['FSI', 'FSI-TC', 'L1', 'PENDING'], ['FSI', 'FSI-TC', 'L1', 'REJECTED'],
    ['MED', 'MED-MG', 'L1', 'VALIDATED'], ['MED', 'MED-MG', 'L1', 'PENDING'], ['MED', 'MED-MG', 'L1', 'DRAFT'],
    ['SG', 'SG-GE', 'L1', 'VALIDATED'], ['SG', 'SG-GBMA', 'L1', 'PENDING'], ['SG', 'SG-GRH', 'L1', 'REJECTED'],
    ['ST', 'ST-GC', 'PREPA', 'VALIDATED'], ['ST', 'ST-GEL', 'PREPA', 'PENDING'], ['ST', 'ST-GM', 'PREPA', 'DRAFT'],
    ['SIC', 'SIC-MM', 'L1', 'VALIDATED'], ['SIC', 'SIC-MM', 'L1', 'PENDING'],
    ['SAE', 'SAE-SE', 'L1', 'PENDING'], ['SAE', 'SAE-SA', 'L1', 'REJECTED'],
    ['DROIT', 'DROIT-SJ', 'L1', 'VALIDATED'], ['DROIT', 'DROIT-SJ', 'L1', 'PENDING'],
    ['ESAU', 'ESAU-ARCH', 'PREPA', 'DRAFT']
];
const OPTION = {
    FSI: 'Mathématiques-Physique', MED: 'Biologie-Chimie', SG: 'Commerciale et Gestion', ST: 'Mathématiques-Physique',
    SIC: 'Littéraire', SAE: 'Biologie-Chimie', DROIT: 'Littéraire', ESAU: 'Mathématiques-Physique'
};
const REJECTION = [
    'Pourcentage au diplôme d\'État inférieur au minimum requis pour le programme.',
    'Dossier incomplet : diplôme d\'État et relevés de notes non fournis dans les délais.',
    'Option suivie au secondaire non admise pour ce programme.'
];

// Noms courants en RDC (sans accents pour des identifiants simples)
const MALE = ['Patrick', 'Daniel', 'Joel', 'Christian', 'Samuel', 'David', 'Jonathan', 'Emmanuel', 'Moise', 'Benjamin', 'Josue', 'Prince', 'Caleb', 'Gloire', 'Fiston'];
const FEMALE = ['Grace', 'Esther', 'Rachel', 'Sarah', 'Merveille', 'Divine', 'Ruth', 'Naomie', 'Prisca', 'Christelle', 'Deborah', 'Gracia', 'Plamedie', 'Exaucee'];
// Aucun nom porté par un enseignant de fsi_enseignants.csv (contrôlé plus bas), ni nom de personnalité publique.
const LAST = ['Mwamba', 'Tshibangu', 'Ngoy', 'Kalala', 'Mbuyi', 'Lukusa', 'Kazadi', 'Banza', 'Kyungu', 'Mutombo', 'Kalenga', 'Nsenga', 'Muteba', 'Kitenge', 'Mulumba', 'Numbi', 'Kapinga', 'Monga', 'Kalombo', 'Mwape'];
const MIDDLE = ['Kayembe', 'Mwenze', 'Lumbu', 'Kaseya', 'Mpanga', 'Kyabu', 'Musonda', 'Kahilu', 'Lenge', 'Mwilambwe', 'Shimba', 'Kitwa', 'Maloba', 'Mukeba', 'Bondo', 'Kasanda', 'Kalwa', 'Mbayi', 'Sapwe', 'Tshiswaka', 'Kamanda', 'Lupaka'];
const TEACHER_NAMES = new Set(fs.readFileSync(path.resolve(import.meta.dirname, '../database/seed-data/fsi-2026-2027/fsi_enseignants.csv'), 'utf8')
    .split(/\r?\n/).slice(1).flatMap((l) => (l.split(';')[1] || '').split(' ')).map((s) => s.toLowerCase()));
for (const name of [...LAST, ...MIDDLE]) if (TEACHER_NAMES.has(name.toLowerCase())) throw new Error(`Nom porté par un enseignant : ${name}`);
const CITY = [
    ['Lubumbashi', 'Haut-Katanga'], ['Likasi', 'Haut-Katanga'], ['Kipushi', 'Haut-Katanga'], ['Kolwezi', 'Lualaba'],
    ['Kinshasa', 'Kinshasa'], ['Kamina', 'Haut-Lomami'], ['Mbuji-Mayi', 'Kasaï-Oriental'], ['Kananga', 'Kasaï-Central'],
    ['Kalemie', 'Tanganyika'], ['Bukavu', 'Sud-Kivu'], ['Goma', 'Nord-Kivu']
];
const SCHOOL = ['Institut', 'Complexe scolaire', 'Lycée', 'Collège'];
const PROFESSION = ['Enseignant', 'Commerçant', 'Infirmier', "Agent de l'État", 'Ingénieur', 'Agriculteur', 'Comptable', 'Chauffeur'];
const RELATION = ['Oncle', 'Tante', 'Frère aîné', 'Sœur aînée', 'Cousin'];

let n = 0;
const rnd = (salt) => createHash('sha256').update(`candidats-2026-2027:${salt}:${n}`).digest().readUInt32BE(0) / 2 ** 32;
const pick = (arr, salt) => arr[Math.floor(rnd(salt) * arr.length)];
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const phone = (salt) => `+243${pick(['81', '97', '98'], `${salt}-op`)}${String(Math.floor(rnd(`${salt}-num`) * 1e7)).padStart(7, '0')}`;
const date = (y1, y2, salt) => {
    const a = Date.UTC(y1, 0, 1), b = Date.UTC(y2, 11, 31);
    return new Date(a + Math.floor(rnd(salt) * ((b - a) / 864e5 + 1)) * 864e5).toISOString().slice(0, 10);
};

const used = { name: new Set(), email: new Set(), phone: new Set(), username: new Set(), first: new Set(), middle: new Set() };
const rows = [];
let rejectIdx = 0;
PLAN.forEach(([fac, prog, level, status], i) => {
    for (n = 0; ; n++) {
        const female = rnd(`g${i}`) < 0.5;
        const first = pick(female ? FEMALE : MALE, `f${i}`);
        const last = pick(LAST, `l${i}`);
        const middle = pick(MIDDLE, `m${i}`);
        const email = `${slug(first)}.${slug(middle)}@${DOMAIN}`;
        const username = `${first.toLowerCase()}.${last.toLowerCase()}`; // calculé ainsi par le backend
        const tel = phone(`t${i}`);
        // Prénoms et postnoms tous différents, pour un jeu varié et des adresses sans collision
        if (used.first.has(first) || used.middle.has(middle) || used.name.has(`${first} ${last} ${middle}`) || used.email.has(email) || used.username.has(username) || used.phone.has(tel)) continue;
        used.first.add(first); used.middle.add(middle);
        used.name.add(`${first} ${last} ${middle}`); used.email.add(email); used.username.add(username); used.phone.add(tel);
        const [city, province] = pick(CITY, `c${i}`);
        const tutorPhone = phone(`tp${i}`), emergencyPhone = phone(`ep${i}`);
        used.phone.add(tutorPhone); used.phone.add(emergencyPhone);
        rows.push({
            ref: `CAND${String(i + 1).padStart(2, '0')}`, faculte: fac, programme: prog, niveau: level, statut_vise: status,
            motif_rejet: status === 'REJECTED' ? REJECTION[rejectIdx++] : '',
            prenom: first, nom: last, postnom: middle, genre: female ? 'FEMALE' : 'MALE',
            date_naissance: date(2003, 2008, `b${i}`), lieu_naissance: city, etat_civil: 'SINGLE', nationalite: 'Congolaise',
            email, telephone: tel, province,
            tuteur_nom: `${pick(MALE, `tn${i}`)} ${last}`, tuteur_telephone: tutorPhone, tuteur_profession: pick(PROFESSION, `tpr${i}`),
            urgence_nom: `${pick(FEMALE, `un${i}`)} ${pick(LAST, `ul${i}`)}`, urgence_telephone: emergencyPhone, urgence_relation: pick(RELATION, `ur${i}`),
            ecole: `${pick(SCHOOL, `s${i}`)} de ${city}`, option: OPTION[fac], pourcentage: String(55 + Math.floor(rnd(`p${i}`) * 31)),
            annee_diplome: String(2024 + Math.floor(rnd(`a${i}`) * 3)), pays_etudes: 'Congo-Kinshasa', ville_etudes: city,
            type: 'NEW', source: 'généré (règles 2026-11-08)'
        });
        break;
    }
});

const keys = Object.keys(rows[0]);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, [keys.join(';'), ...rows.map((r) => keys.map((k) => r[k]).join(';'))].join('\n') + '\n');
const count = (k) => Object.entries(rows.reduce((a, r) => ({ ...a, [r[k]]: (a[r[k]] || 0) + 1 }), {})).map(([v, c]) => `${v}=${c}`).join(' ');
console.log(`${rows.length} candidats -> ${path.relative(process.cwd(), OUT)}`);
console.log('statuts :', count('statut_vise'));
console.log('facultés :', count('faculte'));
console.log('genres :', count('genre'));
