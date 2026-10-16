import { SessionType } from './timetable-entry.model';

/** Séance telle qu'imprimée : ce que montre une cellule de la grille « Horaire Faculté ». */
export interface PrintSession {
    date: string;
    start_hour: string;
    end_hour: string;
    course: string;
    /** Enseignant avec son grade (« C.C Ortega KABWE »). */
    professor: string;
    room: string;
    session_type: SessionType;
    /** Promotion de la séance, utile sur l'horaire d'un enseignant (plusieurs promotions). */
    promotion?: string;
}

/**
 * Une semaine à imprimer ou exporter. L'en-tête reprend le modèle « Horaire Faculté » : logo,
 * « Horaire » + intitulé + période au centre, puis un titre de niveau 2 (niveau — programme).
 */
export interface PrintableTimetable {
    /** Intitulé sous « Horaire » (ex. « Faculté des Sciences Informatiques »). */
    title: string;
    /** Titre de niveau 2 (ex. « L1 — Science Informatique », ou l'enseignant pour son horaire). */
    heading: string;
    /** Lundi de la semaine, `yyyy-MM-dd`. */
    weekStart: string;
    sessions: PrintSession[];
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
