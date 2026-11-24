import { ColumnDef } from '../data-table/column.model';
import { normalize } from '../data-table/table-query';
import { ImportLine } from './import.model';

/** Colonnes du modèle d'import, dans l'ordre du tableau. */
export function importColumns<T>(columns: readonly ColumnDef<T>[]): ColumnDef<T>[] {
    return columns.filter((column) => !!column.import);
}

/** La ligne d'en-tête et la ligne d'exemple du modèle à télécharger. */
export function templateRows<T>(columns: readonly ColumnDef<T>[]): { headers: string[]; example: string[] } {
    const wanted = importColumns(columns);
    return {
        headers: wanted.map((column) => (column.import?.required ? `${column.label} *` : column.label)),
        example: wanted.map((column) => column.import?.example ?? '')
    };
}

/** Une valeur lue selon le type de la colonne ; une erreur lisible sinon. */
function parseCell<T>(column: ColumnDef<T>, text: string): { value: unknown } | { error: string } {
    if (column.import?.parse) {
        return column.import.parse(text);
    }
    switch (column.type) {
        case 'number': {
            const value = Number(text.replace(',', '.'));
            return Number.isFinite(value) ? { value } : { error: `${column.label} : « ${text} » n’est pas un nombre.` };
        }
        case 'boolean': {
            const value = normalize(text);
            if (['oui', 'yes', 'vrai', '1', 'x'].includes(value)) return { value: true };
            if (['non', 'no', 'faux', '0'].includes(value)) return { value: false };
            return { error: `${column.label} : répondez Oui ou Non.` };
        }
        case 'enum': {
            const option = column.options?.find((item) => normalize(item.label) === normalize(text) || normalize(String(item.value)) === normalize(text));
            return option
                ? { value: option.value }
                : { error: `${column.label} : « ${text} » n’est pas une valeur possible (${(column.options ?? []).map((item) => item.label).join(', ')}).` };
        }
        case 'date': {
            const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text) ?? null;
            const iso = match ? `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}` : text.slice(0, 10);
            return /^\d{4}-\d{2}-\d{2}$/.test(iso) && !Number.isNaN(new Date(iso).getTime())
                ? { value: iso }
                : { error: `${column.label} : « ${text} » n’est pas une date (jj/mm/aaaa).` };
        }
        default:
            return { value: text };
    }
}

/**
 * Contrôle d'un fichier avant tout enregistrement : les colonnes sont reconnues par leur libellé
 * (l'astérisque des colonnes obligatoires est ignoré), chaque ligne reçoit ses erreurs, sans aucun
 * identifiant technique. Les lignes entièrement vides sont ignorées.
 */
export function readImport<T>(rows: readonly string[][], columns: readonly ColumnDef<T>[]): { lines: ImportLine[]; missingColumns: string[] } {
    const wanted = importColumns(columns);
    const [header = [], ...data] = rows;
    const position = new Map(header.map((label, index) => [normalize(label.replace(/\*\s*$/, '')), index]));
    const missingColumns = wanted.filter((column) => column.import?.required && !position.has(normalize(column.label))).map((column) => column.label);

    const lines: ImportLine[] = [];
    data.forEach((cellsRow, index) => {
        if (cellsRow.every((cell) => !String(cell ?? '').trim())) {
            return;
        }
        const values: Record<string, unknown> = {};
        const errors: string[] = [];
        const cells: string[] = [];
        for (const column of wanted) {
            const at = position.get(normalize(column.label));
            const text = at === undefined ? '' : String(cellsRow[at] ?? '').trim();
            cells.push(text);
            if (!text) {
                if (column.import?.required) {
                    errors.push(`${column.label} est obligatoire.`);
                }
                continue;
            }
            const parsed = parseCell(column, text);
            if ('error' in parsed) {
                errors.push(parsed.error);
            } else {
                values[column.key] = parsed.value;
            }
        }
        // +2 : la ligne d'en-tête, et Excel compte à partir de 1.
        lines.push({ line: index + 2, values, cells, errors });
    });
    return { lines, missingColumns };
}
