import { InjectionToken } from '@angular/core';
import { ColumnDef } from '../data-table/column.model';

/**
 * Import Excel, branché sur un tableau par simple configuration : les colonnes du modèle viennent
 * de la même description que le filtre et l'export (`ColumnDef.import`), l'enregistrement d'une
 * ligne est fourni par la page.
 */
export interface ImportConfig<T> {
    /** « Importer des salles ». */
    title: string;
    /** Nom du modèle à télécharger, sans extension. */
    templateName: string;
    columns: readonly ColumnDef<T>[];
    /** Enregistre une ligne valide ; un rejet donne le message affiché pour cette ligne. */
    save: (record: ImportRecord) => Promise<unknown>;
}

/** Une ligne lue : valeurs par clé de colonne. */
export type ImportRecord = Record<string, unknown>;

export interface ImportLine {
    /** Numéro de ligne dans le fichier, comme l'utilisateur le voit dans Excel. */
    line: number;
    values: ImportRecord;
    /** Texte des cellules, pour l'aperçu. */
    cells: string[];
    errors: string[];
}

/** Lecture et écriture de classeurs : l'implémentation (ExcelJS aujourd'hui) est isolée. */
export interface SpreadsheetIO {
    /** Première feuille du classeur, en texte, ligne d'en-tête comprise. */
    readRows(file: File): Promise<string[][]>;
    /** Modèle vide : la ligne d'en-tête et une ligne d'exemple. */
    downloadTemplate(fileName: string, headers: string[], example: string[]): Promise<void>;
}

export const SPREADSHEET_IO = new InjectionToken<SpreadsheetIO>('SPREADSHEET_IO');
