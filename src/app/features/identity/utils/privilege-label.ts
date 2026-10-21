import { PERMISSION_SCOPE_LABELS, PermissionScope, parseAuthority, scopeRank } from '@/app/core/permissions/permission-scope';

/** Lecture d'une autorité `module:ressource:action:portée` pour l'écran des rôles. */
export interface PrivilegeDescription {
    name: string;
    /** `module:ressource`, clé de regroupement. */
    group: string;
    groupLabel: string;
    action: string;
    actionLabel: string;
    scope: PermissionScope | null;
    scopeLabel: string | null;
}

export interface PrivilegeGroup {
    key: string;
    label: string;
    items: PrivilegeDescription[];
}

const MODULE_LABELS: Record<string, string> = {
    identity: 'Identité',
    academic: 'Académique',
    admission: 'Admission',
    scheduling: 'Planification'
};

const RESOURCE_LABELS: Record<string, string> = {
    user: 'Utilisateurs',
    profile: 'Profils métier',
    role: 'Rôles',
    privilege: 'Privilèges',
    api: 'API',
    'academic-year': 'Années académiques',
    semester: 'Semestres',
    level: 'Niveaux',
    'professor-grade': 'Grades',
    faculty: 'Facultés',
    'faculty-leadership': 'Direction de faculté',
    program: 'Programmes',
    course: 'Cours',
    'course-unit': 'Unités d’enseignement',
    professor: 'Professeurs',
    'course-assignment': 'Affectations de cours',
    student: 'Étudiants',
    candidate: 'Candidatures',
    room: 'Salles',
    timetable: 'Horaires',
    'timetable-entry': 'Séances'
};

const ACTION_LABELS: Record<string, string> = {
    read: 'Consulter',
    create: 'Créer',
    update: 'Modifier',
    delete: 'Supprimer',
    manage: 'Gérer'
};

const ACTION_ORDER = ['read', 'create', 'update', 'delete', 'manage'];

export const SCOPE_SEVERITIES: Record<PermissionScope, 'success' | 'info' | 'warn' | 'secondary' | 'contrast'> = {
    all: 'contrast',
    faculty: 'info',
    program: 'warn',
    promotion: 'success',
    own: 'secondary'
};

export function describePrivilege(name: string): PrivilegeDescription {
    const { permission, scope } = parseAuthority(name);
    const parts = permission.split(':');
    if (parts.length < 3) {
        return { name, group: name, groupLabel: name, action: '', actionLabel: name, scope, scopeLabel: scope ? PERMISSION_SCOPE_LABELS[scope] : null };
    }
    const [module, resource, ...rest] = parts;
    const action = rest.join(':');
    return {
        name,
        group: `${module}:${resource}`,
        groupLabel: `${MODULE_LABELS[module] ?? module} › ${RESOURCE_LABELS[resource] ?? resource}`,
        action,
        actionLabel: ACTION_LABELS[action] ?? action,
        scope,
        scopeLabel: scope ? PERMISSION_SCOPE_LABELS[scope] : null
    };
}

/** Libellé d'une ligne : « Identité › Utilisateurs — Consulter (Tous) ». */
export function privilegeLabel(name: string): string {
    const description = describePrivilege(name);
    const scope = description.scopeLabel ? ` (${description.scopeLabel})` : '';
    return description.group === name ? name : `${description.groupLabel} — ${description.actionLabel}${scope}`;
}

/** Privilèges regroupés par ressource, triés par libellé, puis par action et portée. */
export function groupPrivileges(names: readonly string[]): PrivilegeGroup[] {
    const groups = new Map<string, PrivilegeGroup>();
    for (const name of names) {
        const description = describePrivilege(name);
        const group = groups.get(description.group) ?? { key: description.group, label: description.groupLabel, items: [] };
        group.items.push(description);
        groups.set(description.group, group);
    }
    const actionRank = (action: string) => {
        const index = ACTION_ORDER.indexOf(action);
        return index < 0 ? ACTION_ORDER.length : index;
    };
    return [...groups.values()]
        .map((group) => ({
            ...group,
            items: group.items.sort(
                (a, b) =>
                    actionRank(a.action) - actionRank(b.action) ||
                    a.action.localeCompare(b.action) ||
                    (b.scope ? scopeRank(b.scope) : -1) - (a.scope ? scopeRank(a.scope) : -1)
            )
        }))
        .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
}
