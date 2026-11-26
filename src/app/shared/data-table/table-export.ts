import { TableExportDocument } from '../export/export-document.model';
import { exportSlug } from '../export/export.service';
import { ColumnDef, cellText } from './column.model';
import { TableQuery, describeQuery } from './table-query';

/**
 * Le document d'export d'un tableau : on exporte ce que l'on voit (lignes filtrées et triées),
 * avec les colonnes exportables et, en tête, les filtres actifs.
 */
export function toTableDocument<T>(options: {
    title: string;
    subtitle?: string;
    /** Les colonnes affichées : les seules imprimées et exportées. */
    columns: readonly ColumnDef<T>[];
    /** Toutes les colonnes du tableau, pour nommer un filtre posé sur une colonne masquée. */
    allColumns?: readonly ColumnDef<T>[];
    rows: readonly T[];
    query?: TableQuery;
    today?: Date;
}): TableExportDocument {
    const columns = options.columns.filter((column) => column.exportable !== false);
    const today = options.today ?? new Date();
    const day = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return {
        kind: 'table',
        title: options.title,
        subtitle: options.subtitle,
        filters: options.query ? describeQuery(options.query, options.allColumns ?? options.columns) : [],
        columns: columns.map((column) => ({ label: column.label, width: column.exportWidth })),
        rows: options.rows.map((row) => columns.map((column) => cellText(column, row))),
        fileName: exportSlug(options.title, options.subtitle ?? '', day)
    };
}
