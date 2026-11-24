import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PrintableTimetable } from '@/app/features/scheduling/timetable/models/timetable-print.model';
import { toWeeklyGridDocument } from '@/app/features/scheduling/timetable/services/timetable-export.service';
import { TableExportDocument } from '../export-document.model';
import { LibraryExportService } from './library-export.service';

const week: PrintableTimetable = {
    title: 'Faculté des Sciences Informatiques',
    heading: 'L1 — Science Informatique',
    weekStart: '2026-10-19',
    sessions: [{ date: '2026-10-19', start_hour: '08:00:00', end_hour: '12:00:00', course: 'Réseaux', professor: 'Prof. Mufind', room: '412', session_type: 'LECTURE' }]
};

/** Service dont les chargements sont remplacés : pas de pdfmake réel, ni de logo à télécharger. */
@Injectable()
class TestableExportService extends LibraryExportService {
    readonly pdf = jasmine.createSpyObj('TCreatedPdf', ['print', 'download']);
    readonly fakePdfMake = { createPdf: jasmine.createSpy('createPdf').and.returnValue(this.pdf), addVirtualFileSystem: () => undefined };
    readonly saved: { blob: Blob; fileName: string }[] = [];
    logoResult: string | null = null;

    protected override loadPdfMake() {
        return Promise.resolve(this.fakePdfMake as never);
    }

    protected override loadLogo() {
        return Promise.resolve(this.logoResult);
    }

    protected override save(blob: Blob, fileName: string): void {
        this.saved.push({ blob, fileName });
    }
}

describe('LibraryExportService', () => {
    let service: TestableExportService;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [TestableExportService] });
        service = TestBed.inject(TestableExportService);
        service.pdf.print.and.resolveTo();
        service.pdf.download.and.resolveTo();
    });

    it('should open the print tab synchronously, then print the PDF into it', async () => {
        const tab = jasmine.createSpyObj<Window>('Window', ['close']);
        const open = spyOn(window, 'open').and.returnValue(tab);

        const printing = service.print(toWeeklyGridDocument([week]));
        // Ouvert avant tout await : le bloqueur de fenêtres voit encore le geste de l'utilisateur.
        expect(open).toHaveBeenCalledWith('', '_blank');
        await printing;

        expect(service.pdf.print).toHaveBeenCalledWith(tab);
        const definition = service.fakePdfMake.createPdf.calls.mostRecent().args[0];
        expect(definition.pageOrientation).toBe('landscape');
    });

    it('should explain a blocked print tab', async () => {
        spyOn(window, 'open').and.returnValue(null);
        await expectAsync(service.print(toWeeklyGridDocument([week]))).toBeRejectedWithError(/bloqué/);
        expect(service.fakePdfMake.createPdf).not.toHaveBeenCalled();
    });

    it('should close the print tab when the PDF fails', async () => {
        const tab = jasmine.createSpyObj<Window>('Window', ['close']);
        spyOn(window, 'open').and.returnValue(tab);
        service.pdf.print.and.rejectWith(new Error('boom'));

        await expectAsync(service.print(toWeeklyGridDocument([week]))).toBeRejected();
        expect(tab.close).toHaveBeenCalled();
    });

    it('should download the PDF under a readable name, with the logo when available', async () => {
        service.logoResult = 'data:image/png;base64,AAAA';
        await service.downloadPdf(toWeeklyGridDocument([week]));

        expect(service.pdf.download).toHaveBeenCalledWith('horaire-l1-science-informatique-2026-10-19.pdf');
        const definition = service.fakePdfMake.createPdf.calls.mostRecent().args[0];
        expect(JSON.stringify(definition.content)).toContain('data:image/png;base64,AAAA');
    });

    it('should save an .xlsx workbook', async () => {
        await service.downloadExcel(toWeeklyGridDocument([week]));

        expect(service.saved.length).toBe(1);
        expect(service.saved[0].fileName).toBe('horaire-l1-science-informatique-2026-10-19.xlsx');
        expect(service.saved[0].blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        expect(service.saved[0].blob.size).toBeGreaterThan(1000);
    });

    describe('liste', () => {
        const table: TableExportDocument = {
            kind: 'table',
            title: 'Liste des étudiants',
            subtitle: 'Faculté des Sciences Informatiques',
            filters: ['Promotion : L1 Génie Logiciel', 'Tri : Nom (A → Z)'],
            columns: [{ label: 'Matricule' }, { label: 'Nom' }, { label: 'Promotion' }],
            rows: [['FSI/2027/0001', 'Kalala Fiston', 'L1 Génie Logiciel']],
            fileName: 'liste-des-etudiants'
        };

        it('should print the rows with the active filters, portrait for few columns', async () => {
            await service.downloadPdf(table);

            expect(service.pdf.download).toHaveBeenCalledWith('liste-des-etudiants.pdf');
            const definition = service.fakePdfMake.createPdf.calls.mostRecent().args[0];
            expect(definition.pageOrientation).toBe('portrait');
            const text = JSON.stringify(definition.content);
            expect(text).toContain('Kalala Fiston');
            expect(text).toContain('Promotion : L1 Génie Logiciel');
        });

        it('should save the list as a workbook', async () => {
            await service.downloadExcel(table);
            expect(service.saved[0].fileName).toBe('liste-des-etudiants.xlsx');
        });
    });
});
