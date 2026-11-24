import { TestBed } from '@angular/core/testing';
import { WeeklyGridDocument } from '@/app/shared/export/export-document.model';
import { EXPORT_SERVICE, ExportService } from '@/app/shared/export/export.service';
import { PrintableTimetable } from '../models/timetable-print.model';
import { TimetableExportService } from './timetable-export.service';

const week: PrintableTimetable = {
    title: 'Faculté des Sciences Informatiques',
    heading: 'Licence 1 Sciences Informatiques',
    weekStart: '2026-10-19',
    sessions: [{ date: '2026-10-19', start_hour: '08:00:00', end_hour: '12:00:00', course: 'Réseaux', professor: 'Prof. Mufind', room: '412', session_type: 'LECTURE' }]
};

describe('TimetableExportService', () => {
    it('should describe one grid page per week and hand it to the export module', async () => {
        const exporter = jasmine.createSpyObj<ExportService>('ExportService', ['print', 'downloadPdf', 'downloadExcel']);
        exporter.downloadPdf.and.resolveTo();
        TestBed.configureTestingModule({ providers: [{ provide: EXPORT_SERVICE, useValue: exporter }] });

        await TestBed.inject(TimetableExportService).downloadPdf([week, { ...week, weekStart: '2026-10-26' }]);

        const document = exporter.downloadPdf.calls.mostRecent().args[0] as WeeklyGridDocument;
        expect(document.kind).toBe('weekly-grid');
        expect(document.fileName).toBe('horaire-licence-1-sciences-informatiques-2026-10-19-au-2026-10-26');
        expect(document.pages.map((page) => page.sheetLabel)).toEqual(['Semaine 43 2026-10-19', 'Semaine 44 2026-10-26']);
        expect(document.pages[0].grid.rows.length).toBeGreaterThan(0);
    });
});
