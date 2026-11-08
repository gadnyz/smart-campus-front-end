// Client minimal de l'API Smart Campus pour les seeders (voir docs/DONNEES_REFERENCE.md).
import fs from 'node:fs';

export const BASE_URL = process.env.SMARTCAMPUS_API_URL || 'http://localhost:8085';
export const CHECK = process.argv.includes('--check');
export const stats = { created: 0, kept: 0, updated: 0 };

let token;

export async function login() {
    const password = process.env.SMARTCAMPUS_API_PASSWORD;
    if (!password) throw new Error("Variable SMARTCAMPUS_API_PASSWORD absente (mot de passe de l'admin).");
    const username = process.env.SMARTCAMPUS_API_USERNAME || 'admin@smart-campus.org';
    token = (await api('/api/v1/auth/login', { method: 'POST', body: { email: username, password } })).access_token;
    console.log(`[api] connecté à ${BASE_URL} en tant que ${username}${CHECK ? ' (SIMULATION)' : ''}`);
}

export async function api(path, { method = 'GET', body, query } = {}) {
    const url = new URL(BASE_URL + path);
    for (const [k, v] of Object.entries(query || {})) if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    for (let attempt = 1; ; attempt++) {
        const res = await fetch(url, {
            method,
            headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: body ? JSON.stringify(body) : undefined
        });
        const text = await res.text();
        let payload;
        try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
        if (res.status === 429 && attempt < 6) {
            console.warn(`[attente] limite de débit (${method} ${path}), nouvel essai dans 65 s`);
            await new Promise((r) => setTimeout(r, 65000));
            continue;
        }
        if (!res.ok) {
            const e = new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(payload)}`);
            e.status = res.status;
            throw e;
        }
        return payload;
    }
}

export async function listAll(path, query = {}) {
    const all = [];
    for (let page = 0; ; page++) {
        const r = await api(path, { query: { ...query, page, size: 100 } });
        if (Array.isArray(r)) return r;
        if (!r || !Array.isArray(r.content)) return all;
        all.push(...r.content);
        if (page + 1 >= (r.total_pages ?? r.totalPages ?? 1)) return all;
    }
}

/** POST, ou simulation avec un identifiant factice en mode --check. */
export async function create(label, identity, path, body) {
    stats.created++;
    if (CHECK) { console.log(`[simulation] créerait ${label} : ${identity}`); return { id: `check:${label}:${identity}`, ...body }; }
    const r = await api(path, { method: 'POST', body });
    console.log(`[créé] ${label} : ${identity}`);
    return r;
}

/** Appel modifiant (PUT/PATCH/POST d'action), ignoré en simulation. */
export async function mutate(label, path, method, body) {
    stats.updated++;
    if (CHECK) { console.log(`[simulation] ${label}`); return null; }
    const r = await api(path, { method, body });
    console.log(`[maj] ${label}`);
    return r;
}

export const isFake = (id) => String(id).startsWith('check:');
export const eq = (a, b) => String(a ?? '').toLowerCase() === String(b ?? '').toLowerCase();

export const clean = (v) => (v ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
export function readCsv(file) {
    const [header, ...lines] = fs.readFileSync(file, 'utf8').replace(/^﻿/, '').trim().split(/\r?\n/);
    const keys = header.split(';').map(clean);
    return lines.filter((l) => l.trim()).map((l) => Object.fromEntries(l.split(';').map((v, i) => [keys[i], clean(v)])));
}
export const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function printStats() {
    console.log(`\n[bilan] créés : ${stats.created}, existants : ${stats.kept}, mis à jour : ${stats.updated}`);
}
