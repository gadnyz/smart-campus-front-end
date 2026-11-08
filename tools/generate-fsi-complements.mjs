// Génère, de façon déterministe, les champs obligatoires absents de fsi_enseignants.csv
// (règles décidées le 2026-11-08, voir docs/DONNEES_REFERENCE.md). Relancer donne le même résultat.
import fs from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = process.argv[2] ?? 'database/seed-data/fsi-2026-2027';
const rows = fs.readFileSync(`${DIR}/fsi_enseignants.csv`, 'utf8').trim().split(/\r?\n/).slice(1).map((l) => l.split(';'));

// Genre déduit du prénom (à confirmer). Toute personne absente de cette liste est signalée.
const FEMALE = new Set(['Odette', 'Mamie']); // Audrey Kasongo : homme (confirmé 2026-11-08)
const MALE = new Set(['Antoine', 'Audrey', 'Jonathan', 'Nathanael', 'Ortega', 'Ken', 'Fabien', 'André', 'Jean-Octave', 'Jacques-Octave', 'Axel',
  'Danny', 'Emmanuel', 'Nick', 'Jean', 'Godwill', 'Hyacinthe', 'Yannick', 'Papy', 'Nathan', 'Landry', 'Charles', 'Gad', 'Junior',
  'Apolinnaire', 'Dauphin', 'Auguste', 'Ebedon', 'Jean-Jacques', 'Patrick', 'Jordan', 'Dony', 'Selain', 'Merlec', 'Thierry', 'Daniel']);
const CITIES = ['Kinshasa', 'Lubumbashi', 'Likasi', 'Kolwezi', 'Mbuji-Mayi', 'Kananga', 'Kisangani', 'Bukavu', 'Goma', 'Matadi',
  'Kalemie', 'Kamina', 'Mbandaka', 'Kikwit', 'Uvira', 'Bunia', 'Kindu', 'Tshikapa', 'Boma', 'Kipushi'];
const MARRIED_GRADES = new Set(['PO', 'P', 'PA', 'CC']); // CT, Dr et ASS : célibataires (confirmé 2026-11-08)

const rnd = (id, salt) => createHash('sha256').update(`${id}:${salt}`).digest().readUInt32BE(0) / 2 ** 32;
const iso = (d) => d.toISOString().slice(0, 10);
const dateBetween = (id, y1, y2) => {
  const a = Date.UTC(y1, 0, 1), b = Date.UTC(y2, 11, 31);
  return iso(new Date(a + Math.floor(rnd(id, 'birth') * ((b - a) / 864e5 + 1)) * 864e5));
};

const out = ['id_enseignant;nom_complet;genre;date_naissance;lieu_naissance;etat_civil;nationalite;telephone;source'];
const warn = [];
for (const [id, nom, grade] of rows) {
  const first = nom.split(' ')[0];
  const gender = FEMALE.has(first) ? 'FEMALE' : MALE.has(first) ? 'MALE' : (warn.push(`${id} ${nom}: prénom inconnu`), '');
  const assistant = grade === 'ASS';
  const birth = assistant ? dateBetween(id, 1992, 2003) : dateBetween(id, 1980, 1990);
  const city = CITIES[Math.floor(rnd(id, 'city') * CITIES.length)];
  const marital = MARRIED_GRADES.has(grade) ? 'MARRIED' : 'SINGLE';
  const prefix = ['97', '98', '81'][Math.floor(rnd(id, 'op') * 3)];
  const phone = `+243${prefix}${String(Math.floor(rnd(id, 'tel') * 1e7)).padStart(7, '0')}`;
  out.push([id, nom, gender, birth, city, marital, 'Congolaise', phone, 'généré (règles 2026-11-08)'].join(';'));
}
fs.writeFileSync(`${DIR}/fsi_enseignants_complements.csv`, out.join('\n') + '\n');
console.log(out.join('\n'));
if (warn.length) console.error('ATTENTION:\n' + warn.join('\n'));
