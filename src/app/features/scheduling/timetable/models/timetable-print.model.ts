import { PrintSession } from '@/app/shared/export/export-document.model';

/** La grille imprimée est un document du module d'export, sans lien avec une librairie. */
export type { PrintCell, PrintDay, PrintGrid, PrintRow, PrintSession } from '@/app/shared/export/export-document.model';

/**
 * Une semaine à imprimer ou exporter. L'en-tête reprend le modèle « Horaire Faculté » : logo,
 * « Horaire » + intitulé + période, puis un titre de niveau 2 (niveau et programme).
 */
export interface PrintableTimetable {
    /** Intitulé sous « Horaire » (ex. « Faculté des Sciences Informatiques »). */
    title: string;
    /** Titre de niveau 2 (ex. « Licence 1 Sciences Informatiques », ou l'enseignant pour son horaire). */
    heading: string;
    /** Lundi de la semaine, `yyyy-MM-dd`. */
    weekStart: string;
    sessions: PrintSession[];
}
