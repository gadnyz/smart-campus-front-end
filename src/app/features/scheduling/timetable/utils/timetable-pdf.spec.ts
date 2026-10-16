import type { Content, ContentColumns, ContentTable, TableCell } from 'pdfmake/interfaces';
import { PrintableTimetable } from '../models/timetable-print.model';
import { PRINT_COLORS } from './timetable-export-style';
import { buildPdfDefinition } from './timetable-pdf';

const week: PrintableTimetable = {
    title: 'Faculté des Sciences Informatiques',
    heading: 'L1 — Science Informatique',
    weekStart: '2026-10-19',
    sessions: [
        { date: '2026-10-19', start_hour: '08:00:00', end_hour: '12:00:00', course: 'Réseaux Informatiques 1', professor: 'Prof. Ebedon Mufind', room: '412', session_type: 'LECTURE' },
        { date: '2026-10-19', start_hour: '13:00:00', end_hour: '17:00:00', course: 'Anglais Technique - 2', professor: 'CT. Godwill Ilunga', room: '412', session_type: 'LECTURE' }
    ]
};

/** Texte d'un nœud pdfmake, sans le type récursif `Text` (trop profond pour `expect`). */
const textOf = (node: unknown): string => (node as { text: string }).text;

const branding = { logo: 'data:image/png;base64,AAAA', appName: 'Smart-campus', printedAt: new Date(2026, 9, 16, 10, 30) };

describe('buildPdfDefinition', () => {
    const definition = buildPdfDefinition([week, { ...week, weekStart: '2026-10-26' }], branding);
    const content = definition.content as Content[];
    const table = (index: number) => content[index] as ContentTable;

    it('should print one A4 landscape page per week', () => {
        expect(definition.pageSize).toBe('A4');
        expect(definition.pageOrientation).toBe('landscape');
        expect(content.length).toBe(6);
        expect((content[0] as ContentColumns).pageBreak).toBeUndefined();
        expect((content[3] as ContentColumns).pageBreak).toBe('before');
    });

    it('should head each page with the logo, « Horaire », the title and the period, then the level and program', () => {
        const header = content[0] as ContentColumns;
        expect((header.columns[0] as unknown as { image?: string }).image).toBe(branding.logo);
        const center: string[] = (header.columns[1] as unknown as { stack: unknown[] }).stack.map(textOf);
        expect(center).toEqual(['Horaire', 'Faculté des Sciences Informatiques', 'Du 19 au 25 octobre 2026']);
        expect(textOf(content[1])).toBe('L1 — Science Informatique');
    });

    it('should draw the grid of the « Horaire Faculté » model', () => {
        const body = table(2).table.body as TableCell[][];
        const [header, dates, morning, pause, afternoon] = body;

        expect(textOf(header[0])).toBe('Semaine 43');
        expect(header.map((cell) => (cell as { fillColor?: string }).fillColor)).toEqual(Array(7).fill(PRINT_COLORS.header));
        expect(textOf(dates[1])).toBe('19 octobre');
        expect(textOf(morning[0])).toBe('8h00 - 12h00');
        const pauseCell = pause[0] as unknown as { colSpan: number; fillColor: string };
        expect(pauseCell.colSpan).toBe(7);
        expect(pauseCell.fillColor).toBe(PRINT_COLORS.pause);
        expect(textOf(afternoon[0])).toBe('13h00 - 17h00');
    });

    it('should colour course, professor and room within a cell', () => {
        const body = table(2).table.body as TableCell[][];
        const cell = body[2][1] as unknown as { stack: { text: (string | { text: string; color: string })[] }[] };
        const parts = cell.stack[0].text.filter((part): part is { text: string; color: string } => typeof part === 'object');
        expect(parts.map((part) => [part.text, part.color])).toEqual([
            ['Réseaux Informatiques 1', PRINT_COLORS.course],
            ['Prof. Ebedon Mufind', PRINT_COLORS.professor],
            ['Salle 412', PRINT_COLORS.room]
        ]);
        expect(textOf(body[2][2])).toBe('');
    });

    it('should leave the logo space empty without a logo, and number pages in the footer', () => {
        const withoutLogo = buildPdfDefinition([week], { ...branding, logo: null });
        expect(textOf(((withoutLogo.content as Content[])[0] as ContentColumns).columns[0])).toBe('');
        const footer = textOf((definition.footer as (page: number, count: number) => unknown)(2, 3));
        expect(footer).toContain('page 2 / 3');
        expect(footer).toContain('Smart-campus');
    });

    it('should say when a week has no session', () => {
        const empty = buildPdfDefinition([{ ...week, sessions: [] }], branding);
        const body = ((empty.content as Content[])[2] as ContentTable).table.body as TableCell[][];
        expect(textOf(body[2][0])).toBe('Aucune séance cette semaine.');
    });
});
