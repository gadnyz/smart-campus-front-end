import { Signal, WritableSignal, computed, signal } from '@angular/core';
import { ColumnDef, cellText, defaultVisibleKeys, shownColumns } from './column.model';
import { EMPTY_QUERY, TableQuery, applyQuery } from './table-query';

/** L'état d'une liste : recherche et filtres, colonnes affichées, lignes à l'écran. */
export interface ListState<T> {
    readonly columns: readonly ColumnDef<T>[];
    readonly query: WritableSignal<TableQuery>;
    /** Clés des colonnes affichées (choix de l'utilisateur, aussi celles imprimées). */
    readonly visibleKeys: WritableSignal<string[]>;
    readonly shownColumns: Signal<ColumnDef<T>[]>;
    /** Lignes filtrées : celles du tableau, de l'impression et de l'export. */
    readonly rows: Signal<T[]>;
    readonly cellText: (column: ColumnDef<T>, row: T) => string;
}

/**
 * Branche une liste sur le composant de recherche et la barre d'outils, à partir de la seule
 * description de ses colonnes et des lignes chargées.
 */
export function listState<T>(columns: readonly ColumnDef<T>[], loaded: Signal<readonly T[]>): ListState<T> {
    const query = signal<TableQuery>(EMPTY_QUERY);
    const visibleKeys = signal(defaultVisibleKeys(columns));
    return {
        columns,
        query,
        visibleKeys,
        shownColumns: computed(() => shownColumns(columns, visibleKeys())),
        rows: computed(() => applyQuery(loaded(), columns, query())),
        cellText
    };
}
