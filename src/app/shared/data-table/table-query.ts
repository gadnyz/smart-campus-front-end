import { CellValue, ColumnDef, ColumnType, cellText } from './column.model';

/** Les conditions d'un filtre de colonne, à la manière du filtre Google Sheets. */
export type FilterOperator = 'in' | 'contains' | 'notContains' | 'startsWith' | 'empty' | 'notEmpty' | 'before' | 'after' | 'between' | 'gte' | 'lte';

export interface FilterRule {
    key: string;
    operator: FilterOperator;
    /** Texte, nombre ou date (`yyyy-MM-dd`) selon l'opérateur. */
    value?: string | number | null;
    /** Borne haute de « entre ». */
    to?: string | number | null;
    /** Valeurs exactes cochées (« in »), en texte affiché. */
    values?: string[];
}

export interface SortRule {
    key: string;
    direction: 'asc' | 'desc';
}

/** L'état de recherche d'un tableau : recherche simple, filtres combinés (ET) et tri. */
export interface TableQuery {
    search: string;
    filters: FilterRule[];
    sort: SortRule | null;
}

export const EMPTY_QUERY: TableQuery = { search: '', filters: [], sort: null };

export const OPERATOR_LABELS: Record<FilterOperator, string> = {
    in: 'est l’une des valeurs',
    contains: 'contient',
    notContains: 'ne contient pas',
    startsWith: 'commence par',
    empty: 'est vide',
    notEmpty: 'n’est pas vide',
    before: 'avant le',
    after: 'après le',
    between: 'entre',
    gte: 'supérieur ou égal à',
    lte: 'inférieur ou égal à'
};

/** Les conditions proposées pour un type de colonne. */
export function operatorsFor(type: ColumnType): FilterOperator[] {
    switch (type) {
        case 'text':
            return ['in', 'contains', 'notContains', 'startsWith', 'empty', 'notEmpty'];
        case 'number':
            return ['in', 'gte', 'lte', 'between', 'empty', 'notEmpty'];
        case 'date':
            return ['before', 'after', 'between', 'empty', 'notEmpty'];
        case 'enum':
        case 'boolean':
            return ['in', 'empty', 'notEmpty'];
    }
}

/** Sans accents ni casse : « Élodie » trouve « elodie ». */
export function normalize(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .trim();
}

function isEmpty(value: CellValue): boolean {
    return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

function dayOf(value: CellValue | string): string | null {
    if (isEmpty(value as CellValue)) {
        return null;
    }
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
    }
    return String(value).slice(0, 10);
}

/** La ligne satisfait-elle la condition de cette colonne ? */
export function matchesRule<T>(row: T, column: ColumnDef<T>, rule: FilterRule): boolean {
    const raw = column.value(row);
    const text = normalize(cellText(column, row));
    const wanted = normalize(String(rule.value ?? ''));
    switch (rule.operator) {
        case 'empty':
            return isEmpty(raw);
        case 'notEmpty':
            return !isEmpty(raw);
        case 'in':
            return (rule.values ?? []).some((value) => normalize(value) === text);
        case 'contains':
            return text.includes(wanted);
        case 'notContains':
            return !text.includes(wanted);
        case 'startsWith':
            return text.startsWith(wanted);
        case 'gte':
            return !isEmpty(raw) && Number(raw) >= Number(rule.value);
        case 'lte':
            return !isEmpty(raw) && Number(raw) <= Number(rule.value);
        case 'before': {
            const day = dayOf(raw);
            return day !== null && day < String(rule.value);
        }
        case 'after': {
            const day = dayOf(raw);
            return day !== null && day > String(rule.value);
        }
        case 'between': {
            if (column.type === 'number') {
                return !isEmpty(raw) && Number(raw) >= Number(rule.value) && Number(raw) <= Number(rule.to);
            }
            const day = dayOf(raw);
            return day !== null && day >= String(rule.value) && day <= String(rule.to);
        }
    }
}

function compare(a: CellValue, b: CellValue, type: ColumnType): number {
    if (isEmpty(a) || isEmpty(b)) {
        // Les cellules vides vont toujours à la fin.
        return isEmpty(a) === isEmpty(b) ? 0 : isEmpty(a) ? 1 : -1;
    }
    if (type === 'number') {
        return Number(a) - Number(b);
    }
    if (type === 'date') {
        return (dayOf(a) ?? '').localeCompare(dayOf(b) ?? '');
    }
    return String(a).localeCompare(String(b), 'fr', { sensitivity: 'base', numeric: true });
}

/**
 * Applique la recherche simple, les filtres (tous à la fois) et le tri à des lignes chargées.
 * Les critères que l'API traite déjà (fonctionnement mixte) sont simplement vérifiés à nouveau.
 */
export function applyQuery<T>(rows: readonly T[], columns: readonly ColumnDef<T>[], query: TableQuery): T[] {
    const byKey = new Map(columns.map((column) => [column.key, column]));
    const search = normalize(query.search);
    const searchable = columns.filter((column) => column.searchable);

    let result = rows.filter((row) => {
        if (search && !searchable.some((column) => normalize(cellText(column, row)).includes(search))) {
            return false;
        }
        return query.filters.every((rule) => {
            const column = byKey.get(rule.key);
            return !column || matchesRule(row, column, rule);
        });
    });

    const sortColumn = query.sort ? byKey.get(query.sort.key) : undefined;
    if (query.sort && sortColumn) {
        const direction = query.sort.direction === 'asc' ? 1 : -1;
        const type = sortColumn.type;
        result = [...result].sort((a, b) => {
            const valueA = sortColumn.value(a);
            const valueB = sortColumn.value(b);
            // Le vide reste à la fin quel que soit le sens.
            if (isEmpty(valueA) !== isEmpty(valueB)) {
                return isEmpty(valueA) ? 1 : -1;
            }
            const sortA = type === 'enum' ? cellText(sortColumn, a) : valueA;
            const sortB = type === 'enum' ? cellText(sortColumn, b) : valueB;
            return compare(sortA, sortB, type) * direction;
        });
    }
    return result;
}

const SHORT_DATE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

function dateLabel(value: string | number | null | undefined): string {
    if (!value) {
        return '';
    }
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? String(value) : SHORT_DATE.format(date);
}

/** Un filtre lisible, pour sa pastille et pour l'export : « Promotion : L1 Génie Logiciel ». */
export function describeRule<T>(rule: FilterRule, column: ColumnDef<T> | undefined): string {
    const label = column?.label ?? rule.key;
    const show = (value: string | number | null | undefined) => (column?.type === 'date' ? dateLabel(value) : String(value ?? ''));
    switch (rule.operator) {
        case 'in':
            return `${label} : ${(rule.values ?? []).join(', ')}`;
        case 'empty':
        case 'notEmpty':
            return `${label} ${OPERATOR_LABELS[rule.operator]}`;
        case 'between':
            return `${label} entre ${show(rule.value)} et ${show(rule.to)}`;
        default:
            return `${label} ${OPERATOR_LABELS[rule.operator]} « ${show(rule.value)} »`;
    }
}

export function describeSort<T>(sort: SortRule | null, columns: readonly ColumnDef<T>[]): string | null {
    if (!sort) {
        return null;
    }
    const column = columns.find((item) => item.key === sort.key);
    if (!column) {
        return null;
    }
    const arrow = column.type === 'number' || column.type === 'date' ? (sort.direction === 'asc' ? 'croissant' : 'décroissant') : sort.direction === 'asc' ? 'A → Z' : 'Z → A';
    return `Tri : ${column.label} (${arrow})`;
}

/** Recherche, filtres et tri, en phrases : l'en-tête d'un export dit ce qu'on a exporté. */
export function describeQuery<T>(query: TableQuery, columns: readonly ColumnDef<T>[]): string[] {
    const byKey = new Map(columns.map((column) => [column.key, column]));
    return [
        ...(query.search.trim() ? [`Recherche : « ${query.search.trim()} »`] : []),
        ...query.filters.map((rule) => describeRule(rule, byKey.get(rule.key))),
        ...(describeSort(query.sort, columns) ? [describeSort(query.sort, columns)!] : [])
    ];
}

/** Valeurs distinctes d'une colonne, triées, pour les cases à cocher « valeur exacte ». */
export function distinctValues<T>(rows: readonly T[], column: ColumnDef<T>): string[] {
    const values = new Set(rows.map((row) => cellText(column, row)).filter((text) => text !== ''));
    if (column.type === 'enum') {
        for (const option of column.options ?? []) {
            values.add(option.label);
        }
    }
    return [...values].sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));
}
