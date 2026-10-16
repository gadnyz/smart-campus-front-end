import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { PrintableTimetable } from '../../models/timetable-print.model';
import { TimetableExportService } from '../../services/timetable-export.service';
import { TimetableExportMenu } from './timetable-export-menu';

const week: PrintableTimetable = { title: 'Faculté', heading: 'L1 — Info', weekStart: '2026-10-19', sessions: [] };

describe('TimetableExportMenu', () => {
    let fixture: ComponentFixture<TimetableExportMenu>;
    let menu: TimetableExportMenu;
    let exportService: jasmine.SpyObj<TimetableExportService>;
    let messages: MessageService;

    beforeEach(() => {
        exportService = jasmine.createSpyObj<TimetableExportService>('TimetableExportService', ['print', 'downloadPdf', 'downloadExcel']);
        exportService.print.and.resolveTo();
        exportService.downloadPdf.and.resolveTo();
        exportService.downloadExcel.and.resolveTo();
        TestBed.configureTestingModule({ imports: [TimetableExportMenu], providers: [{ provide: TimetableExportService, useValue: exportService }] });
        fixture = TestBed.createComponent(TimetableExportMenu);
        menu = fixture.componentInstance;
        messages = fixture.debugElement.injector.get(MessageService);
        fixture.componentRef.setInput('documents', [week]);
        fixture.detectChanges();
    });

    it('should offer print, PDF and Excel', () => {
        expect(menu.items().map((item) => item.label)).toEqual(['Imprimer', 'Télécharger le PDF', 'Télécharger le fichier Excel']);
    });

    it('should hand the documents to the matching export', async () => {
        menu.items()[0].command?.({});
        await fixture.whenStable();
        menu.items()[1].command?.({});
        await fixture.whenStable();
        menu.items()[2].command?.({});
        await fixture.whenStable();

        expect(exportService.print).toHaveBeenCalledWith([week]);
        expect(exportService.downloadPdf).toHaveBeenCalledWith([week]);
        expect(exportService.downloadExcel).toHaveBeenCalledWith([week]);
        expect(menu.busy()).toBeNull();
    });

    it('should ignore a second export while one is running', () => {
        exportService.downloadPdf.and.returnValue(new Promise(() => undefined));
        menu.run('pdf');
        menu.run('excel');
        expect(menu.busy()).toBe('pdf');
        expect(exportService.downloadExcel).not.toHaveBeenCalled();
    });

    it('should report a failed export', async () => {
        const add = spyOn(messages, 'add');
        exportService.downloadExcel.and.rejectWith(new Error('Le navigateur a bloqué l’ouverture'));

        menu.run('excel');
        await fixture.whenStable();
        await Promise.resolve();

        expect(add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', detail: 'Le navigateur a bloqué l’ouverture' }));
        expect(menu.busy()).toBeNull();
    });

    it('should be disabled without documents or with a reason', () => {
        fixture.componentRef.setInput('documents', []);
        fixture.detectChanges();
        expect(menu.unavailable()).toBeTrue();

        fixture.componentRef.setInput('documents', [week]);
        fixture.componentRef.setInput('disabledReason', 'Enregistrez d’abord');
        fixture.detectChanges();
        expect(menu.unavailable()).toBeTrue();
        expect((fixture.nativeElement as HTMLElement).querySelector('span[title]')?.getAttribute('title')).toBe('Enregistrez d’abord');

        menu.run('pdf');
        expect(exportService.downloadPdf).not.toHaveBeenCalled();
    });
});
