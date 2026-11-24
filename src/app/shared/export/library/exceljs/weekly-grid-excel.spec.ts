import type { RichText, Workbook } from 'exceljs';
import { PrintableTimetable } from '../models/timetable-print.model';
import { PRINT_COLORS, argb } from './timetable-export-style';
import { fillWorkbook, sheetName } from './timetable-excel';

/** PNG 1×1 transparent. */
const PIXEL = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const week: PrintableTimetable = {
    title: 'Faculté des Sciences Informatiques',
    heading: 'L1 — Science Informatique',
    weekStart: '2026-10-19',
    sessions: [
        { date: '2026-10-19', start_hour: '08:00:00', end_hour: '12:00:00', course: 'Réseaux Informatiques 1', professor: 'Prof. Ebedon Mufind', room: '412', session_type: 'LECTURE' },
        { date: '2026-10-20', start_hour: '13:00:00', end_hour: '17:00:00', course: 'Anglais Technique - 2', professor: 'CT. Godwill Ilunga', room: '412', session_type: 'LECTURE', promotion: 'L2 · Info' }
    ]
};

describe('fillWorkbook', () => {
    let workbook: Workbook;

    beforeAll(async () => {
        const module = await import('exceljs');
        const ExcelJS = ((module as unknown as { default?: typeof module }).default ?? module) as typeof module;
        workbook = new ExcelJS.Workbook();
        fillWorkbook(workbook, [week, { ...week, weekStart: '2026-10-26' }], { logoBase64: PIXEL, appName: 'Smart-campus' });
    });

    it('should add one A4 landscape sheet per week, fitted to the page width', () => {
        expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Semaine 43 2026-10-19', 'Semaine 44 2026-10-26']);
        const setup = workbook.worksheets[0].pageSetup;
        expect([setup.paperSize, setup.orientation, setup.fitToWidth, setup.fitToHeight]).toEqual([9, 'landscape', 1, 0]);
        expect(workbook.creator).toBe('Smart-campus');
    });

    it('should put the logo and the « Horaire Faculté » header above the grid', () => {
        const sheet = workbook.worksheets[0];
        expect(sheet.getImages().length).toBe(1);
        expect([sheet.getCell('B1').value, sheet.getCell('B2').value, sheet.getCell('B3').value]).toEqual([
            'Horaire',
            'Faculté des Sciences Informatiques',
            'Du 19 au 25 octobre 2026'
        ]);
        expect(sheet.getCell('A4').value).toBe('L1 — Science Informatique');
    });

    it('should draw the blue day header, the dates, the slots and the grey pause row', () => {
        const sheet = workbook.worksheets[0];
        expect(sheet.getCell('A6').value).toBe('Semaine 43');
        expect(sheet.getCell('B6').value).toBe('Lundi');
        expect(sheet.getCell('G6').value).toBe('Samedi');
        expect((sheet.getCell('B6').fill as { fgColor: { argb: string } }).fgColor.argb).toBe(argb(PRINT_COLORS.header));
        expect(sheet.getCell('B7').value).toBe('19 octobre');
        expect(sheet.getCell('A8').value).toBe('8h00 - 12h00');
        expect((sheet.getCell('A9').fill as { fgColor: { argb: string } }).fgColor.argb).toBe(argb(PRINT_COLORS.pause));
        expect(sheet.getCell('A10').value).toBe('13h00 - 17h00');
    });

    it('should colour course, promotion, professor and room within a cell', () => {
        const sheet = workbook.worksheets[0];
        const monday = (sheet.getCell('B8').value as { richText: RichText[] }).richText;
        expect(monday.map((part) => [part.text, part.font?.color?.argb])).toEqual([
            ['Réseaux Informatiques 1', argb(PRINT_COLORS.course)],
            ['\nProf. Ebedon Mufind', argb(PRINT_COLORS.professor)],
            ['\nSalle 412', argb(PRINT_COLORS.room)]
        ]);
        const tuesday = (sheet.getCell('C10').value as { richText: RichText[] }).richText.map((part) => part.text);
        expect(tuesday).toEqual(['Anglais Technique - 2', '\nL2 · Info', '\nCT. Godwill Ilunga', '\nSalle 412']);
        expect(sheet.getRow(10).height).toBeGreaterThan(sheet.getRow(8).height!);
    });

    it('should produce a readable .xlsx buffer', async () => {
        const buffer = await workbook.xlsx.writeBuffer();
        expect(buffer.byteLength).toBeGreaterThan(1000);
    });

    it('should keep sheet names valid and unique', () => {
        expect(sheetName('Semaine 43 [L1]: test/2026?', new Set())).toBe('Semaine 43  L1   test 2026');
        expect(sheetName('Semaine 43', new Set(['Semaine 43']))).toBe('Semaine 43 (2)');
        expect(sheetName('x'.repeat(40), new Set()).length).toBe(31);
    });
});
