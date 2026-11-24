/**
 * Documents à imprimer ou exporter, décrits sans aucune librairie : les modules métier les
 * construisent, l'implémentation d'`ExportService` les rend en PDF ou en Excel.
 */

// ----- Tableau (listes : étudiants, cours…) -----

export interface TableExportColumn {
    label: string;
    /** Largeur relative (1 par défaut). */
    width?: number;
}

/** Ce qu'on voit à l'écran : lignes déjà filtrées et triées, valeurs déjà mises en texte. */
export interface TableExportDocument {
    kind: 'table';
    /** « Liste des étudiants ». */
    title: string;
    /** Faculté, année… */
    subtitle?: string;
    /** Filtres et tri actifs, lisibles : « Promotion : L1 Génie Logiciel », « Tri : Nom (A → Z) ». */
    filters?: string[];
    columns: TableExportColumn[];
    rows: string[][];
    /** Nom de fichier sans extension. */
    fileName: string;
}

// ----- Grille hebdomadaire (horaires, modèle « Horaire Faculté ») -----

/** Séance telle qu'imprimée : ce que montre une cellule de la grille. */
export interface PrintSession {
    date: string;
    start_hour: string;
    end_hour: string;
    course: string;
    /** Enseignant avec son grade (« C.C Ortega KABWE »). */
    professor: string;
    room: string;
    session_type: string;
    /** Promotion de la séance, utile sur l'horaire d'un enseignant ou d'une faculté. */
    promotion?: string;
}

export interface PrintDay {
    date: string;
    /** « Lundi ». */
    weekday: string;
    /** « 19 octobre ». */
    label: string;
}

export type PrintCell = PrintSession[];

export type PrintRow =
    | { kind: 'slot'; label: string; start: string; end: string; cells: PrintCell[] }
    /** Pause d'au moins une heure entre deux créneaux (la ligne grise du modèle). */
    | { kind: 'break' };

export interface PrintGrid {
    /** « Semaine 42 ». */
    weekLabel: string;
    /** « Du 12 au 18 octobre 2026 ». */
    period: string;
    days: PrintDay[];
    rows: PrintRow[];
}

/** Une page : l'en-tête « Horaire » + intitulé + période, un titre de niveau 2, puis la grille. */
export interface WeeklyGridPage {
    /** Intitulé sous « Horaire » (ex. « Faculté des Sciences Informatiques »). */
    title: string;
    /** Titre de niveau 2 (ex. « Licence 1 Sciences Informatiques »). */
    heading: string;
    /** Nom de l'onglet Excel (ex. « Semaine 43 L1 GL »), rendu unique au besoin. */
    sheetLabel: string;
    grid: PrintGrid;
}

export interface WeeklyGridDocument {
    kind: 'weekly-grid';
    pages: WeeklyGridPage[];
    /** Nom de fichier sans extension. */
    fileName: string;
    /** Titre du PDF (métadonnées). */
    documentTitle: string;
}

export type ExportDocument = TableExportDocument | WeeklyGridDocument;
