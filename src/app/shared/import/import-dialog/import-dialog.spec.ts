import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ColumnDef } from '../../data-table/column.model';
import { ImportConfig, SPREADSHEET_IO, SpreadsheetIO } from '../import.model';
import { ImportDialog } from './import-dialog';

interface Room {
    name: string;
    capacity: number;
}

const columns: ColumnDef<Room>[] = [
    { key: 'name', label: 'Nom', type: 'text', value: (row) => row.name, import: { required: true, example: '402 A' } },
    { key: 'capacity', label: 'Capacité', type: 'number', value: (row) => row.capacity, import: { required: true, example: '60' } }
];

describe('ImportDialog', () => {
    let fixture: ComponentFixture<ImportDialog<Room>>;
    let component: ImportDialog<Room>;
    let spreadsheet: jasmine.SpyObj<SpreadsheetIO>;
    let save: jasmine.Spy<ImportConfig<Room>['save']>;

    const fileEvent = () => ({ target: { files: [new File([''], 'salles.xlsx')], value: 'salles.xlsx' } }) as unknown as Event;

    beforeEach(() => {
        spreadsheet = jasmine.createSpyObj<SpreadsheetIO>('SpreadsheetIO', ['readRows', 'downloadTemplate']);
        save = jasmine.createSpy('save');
        TestBed.configureTestingModule({ imports: [ImportDialog], providers: [{ provide: SPREADSHEET_IO, useValue: spreadsheet }] });
        fixture = TestBed.createComponent(ImportDialog<Room>);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('config', { title: 'Importer des salles', templateName: 'salles', columns, save });
    });

    it('should download a template made of the importable columns', async () => {
        spreadsheet.downloadTemplate.and.resolveTo();
        await component.downloadTemplate();
        expect(spreadsheet.downloadTemplate).toHaveBeenCalledWith('modele-salles', ['Nom *', 'Capacité *'], ['402 A', '60']);
    });

    it('should preview the file with its errors, then save only the valid lines', async () => {
        spreadsheet.readRows.and.resolveTo([
            ['Nom', 'Capacité'],
            ['402 A', '60'],
            ['', 'trente']
        ]);
        await component.onFile(fileEvent());

        expect(component.step()).toBe('preview');
        expect(component.validLines().length).toBe(1);
        expect(component.invalidLines()[0].errors).toEqual(['Nom est obligatoire.', 'Capacité : « trente » n’est pas un nombre.']);

        save.and.resolveTo();
        const imported = jasmine.createSpy('imported');
        component.imported.subscribe(imported);
        await component.save();

        expect(save).toHaveBeenCalledOnceWith({ name: '402 A', capacity: 60 });
        expect(component.savedCount()).toBe(1);
        expect(imported).toHaveBeenCalled();
    });

    it('should name the lines refused by the server, without identifiers', async () => {
        spreadsheet.readRows.and.resolveTo([
            ['Nom', 'Capacité'],
            ['402 A', '60']
        ]);
        await component.onFile(fileEvent());
        save.and.rejectWith(new HttpErrorResponse({ status: 409, error: { detail: 'La salle 01a1bc87-a035-7198-b6cf-2f25dc36d4d6 existe déjà.' } }));

        await component.save();

        expect(component.rejected()).toEqual([{ line: 2, message: 'La salle existe déjà.' }]);
    });

    it('should refuse a file without the required columns', async () => {
        spreadsheet.readRows.and.resolveTo([['Nom'], ['402 A']]);
        await component.onFile(fileEvent());
        expect(component.step()).toBe('file');
        expect(component.fileError()).toContain('Capacité');
    });
});
