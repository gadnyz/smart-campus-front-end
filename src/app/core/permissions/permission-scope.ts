/**
 * Portées des autorités `module:ressource:action:portée`, alignées sur `ScopeLevel` du backend.
 *
 * `faculty`, `program` et `promotion` sont ancrées côté serveur sur un nœud de l'arbre
 * académique (affectation SAF, inscription d'un étudiant, faculté d'un professeur) : le
 * contexte utilisateur ne transmet que l'autorité, pas son ancre. Le front s'en sert pour
 * afficher ou masquer, et laisse le backend restreindre les données.
 */
export const PERMISSION_SCOPES = ['own', 'promotion', 'program', 'faculty', 'all'] as const;
export type PermissionScope = (typeof PERMISSION_SCOPES)[number];

export const PERMISSION_SCOPE_LABELS: Record<PermissionScope, string> = {
    own: 'Personnel',
    promotion: 'Promotion',
    program: 'Programme',
    faculty: 'Faculté',
    all: 'Tous'
};

export interface ParsedAuthority {
    /** L'autorité sans sa portée, par exemple `academic:student:read`. */
    permission: string;
    /** `null` pour une autorité sans portée (`identity:api:manage`). */
    scope: PermissionScope | null;
}

export function isPermissionScope(value: string): value is PermissionScope {
    return (PERMISSION_SCOPES as readonly string[]).includes(value);
}

export function parseAuthority(authority: string): ParsedAuthority {
    const separator = authority.lastIndexOf(':');
    const suffix = separator < 0 ? '' : authority.slice(separator + 1);
    if (!isPermissionScope(suffix)) {
        return { permission: authority, scope: null };
    }
    return { permission: authority.slice(0, separator), scope: suffix };
}

export function scopedAuthority(permission: string, scope: PermissionScope): string {
    return `${permission}:${scope}`;
}

/**
 * Portées d'un droit de gestion. `own` en est exclu : modifier son propre dossier (un candidat,
 * un étudiant) ne fait pas de quelqu'un un gestionnaire de la ressource.
 */
export const MANAGEMENT_SCOPES: readonly PermissionScope[] = ['promotion', 'program', 'faculty', 'all'];

/** Les clés qui autorisent `permission` (`academic:student:update`) au-delà de soi-même. */
export function writeAuthorities(permission: string): string[] {
    return MANAGEMENT_SCOPES.map((scope) => scopedAuthority(permission, scope));
}

/** Portées de lecture qui ouvrent un écran de gestion : celle de sa faculté, ou de tout. */
export const MANAGEMENT_READ_SCOPES: readonly PermissionScope[] = ['faculty', 'all'];

/**
 * Les clés qui ouvrent l'écran de gestion d'une ressource (`academic:student`) : une écriture
 * (création, modification, suppression) à une portée de gestion, ou la lecture de sa faculté
 * ou de tout. Les actions de l'écran restent soumises à l'écriture (`canWrite`).
 */
export function manageAuthorities(resource: string): string[] {
    return [
        ...['create', 'update', 'delete'].flatMap((action) => writeAuthorities(`${resource}:${action}`)),
        ...MANAGEMENT_READ_SCOPES.map((scope) => scopedAuthority(`${resource}:read`, scope))
    ];
}

/** Rang d'une portée, de la plus étroite (`own`) à la plus large (`all`). */
export function scopeRank(scope: PermissionScope): number {
    return PERMISSION_SCOPES.indexOf(scope);
}

/**
 * Portée la plus large détenue pour `permission` (`academic:student:read`), `null` si aucune.
 * Une autorité sans portée exacte compte comme `all`.
 */
export function widestScope(authorities: readonly string[], permission: string): PermissionScope | null {
    let widest: PermissionScope | null = null;
    for (const authority of authorities) {
        if (authority === permission) {
            return 'all';
        }
        const parsed = parseAuthority(authority);
        if (parsed.permission === permission && parsed.scope && (widest === null || scopeRank(parsed.scope) > scopeRank(widest))) {
            widest = parsed.scope;
        }
    }
    return widest;
}
