import { Injectable, Injector, inject } from '@angular/core';
import { WeeklyGridDocument } from '@/app/shared/export/export-document.model';
import { EXPORT_SERVICE } from '@/app/shared/export/export.service';
import { PrintableTimetable } from '../models/timetable-print.model';
import { buildPrintGrid, exportFileName } from '../utils/timetable-print-grid';

/**
 * Impression et exports des horaires au format « Horaire Faculté ». La Planification ne fait que
 * décrire le document (une grille par semaine) ; le rendu PDF ou Excel revient au module d'export.
 */
@Injectable({ providedIn: 'root' })
export class TimetableExportService {
    private readonly injector = inject(Injector);

    /** Lu au premier export : une page qui n'exporte rien n'en dépend pas. */
    private get exporter() {
        return this.injector.get(EXPORT_SERVICE);
    }

    print(timetables: readonly PrintableTimetable[]): Promise<void> {
        return this.exporter.print(toWeeklyGridDocument(timetables));
    }

    downloadPdf(timetables: readonly PrintableTimetable[]): Promise<void> {
        return this.exporter.downloadPdf(toWeeklyGridDocument(timetables));
    }

    downloadExcel(timetables: readonly PrintableTimetable[]): Promise<void> {
        return this.exporter.downloadExcel(toWeeklyGridDocument(timetables));
    }
}

/** Une page par semaine et par horaire, la grille déjà calculée. */
export function toWeeklyGridDocument(timetables: readonly PrintableTimetable[]): WeeklyGridDocument {
    return {
        kind: 'weekly-grid',
        fileName: exportFileName(timetables),
        documentTitle: `Horaire — ${timetables[0]?.heading ?? ''}`,
        pages: timetables.map((timetable) => {
            const grid = buildPrintGrid(timetable);
            return { title: timetable.title, heading: timetable.heading, sheetLabel: `${grid.weekLabel} ${timetable.weekStart}`, grid };
        })
    };
}
