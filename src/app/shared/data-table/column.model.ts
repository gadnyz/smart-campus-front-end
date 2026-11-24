/**
 * La description des colonnes d'un tableau, déclarée une seule fois. Le filtre (recherche,
 * filtres avancés, tri), l'export (PDF, Excel) et l'import Excel la lisent tous les trois.
 */
export type ColumnType = 'text' | 'number' | 'date' | 'enum' | 'boolean';

export type CellValue = string | number | boolean | Date | null | undefined;

export interface ColumnOption {
    label: string;
    value: string | number | boolean;
}

/** Lecture d'une cellule Excel importée : la valeur, ou un message d'erreur lisible. */
export type ImportParse = (text: string) => { value: unknown } | { error: string };

export interface ColumnDef<T> {
    /** Identifiant stable de la colonne (sert aux filtres et au tri). */
    key: string;
    label: string;
    type: ColumnType;
    /** La valeur brute de la ligne pour cette colonne. */
    value: (row: T) => CellValue;
    /** Texte affiché et exporté ; par défaut la valeur mise en forme selon le type. */
    format?: (row: T) => string;
    /** Valeurs possibles d'une colonne `enum` (libellés lisibles). */
    options?: ColumnOption[];
    /** Prise en compte par la recherche simple. */
    searchable?: boolean;
    /** `false` pour exclure des filtres avancés (par défaut : oui). */
    filterable?: boolean;
    /** `false` pour exclure du tri (par défaut : oui). */
    sortable?: boolean;
    /** `false` pour exclure de l'export (par défaut : oui). */
    exportable?: boolean;
    /** Largeur relative à l'export (1 par défaut). */
    exportWidth?: number;
    /**
     * Nom du critère côté API, pour le fonctionnement mixte : un tri (`sort=<apiKey>,asc`) ou un
     * filtre de valeur exacte passe par le serveur quand il est déclaré.
     */
    apiKey?: string;
    /** Colonne du modèle d'import Excel ; absente : la colonne n'est pas importée. */
    import?: {
        required?: boolean;
        /** Exemple écrit dans le modèle à télécharger. */
        example?: string;
        parse?: ImportParse;
    };
}

const DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

/** Texte d'une cellule, tel qu'à l'écran et à l'export. */
export function cellText<T>(column: ColumnDef<T>, row: T): string {
    if (column.format) {
        return column.format(row);
    }
    const value = column.value(row);
    if (value === null || value === undefined || value === '') {
        return '';
    }
    if (column.type === 'enum') {
        return column.options?.find((option) => option.value === value)?.label ?? String(value);
    }
    if (column.type === 'boolean') {
        return value ? 'Oui' : 'Non';
    }
    if (column.type === 'date') {
        const date = value instanceof Date ? value : new Date(String(value));
        return Number.isNaN(date.getTime()) ? String(value) : DATE_FORMAT.format(date);
    }
    return String(value);
}
