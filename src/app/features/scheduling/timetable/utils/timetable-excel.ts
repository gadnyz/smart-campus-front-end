import type { Borders, Cell, RichText, Workbook, Worksheet } from 'exceljs';
import { PrintGrid, PrintSession, PrintableTimetable } from '../models/timetable-print.model';
import { PRINT_COLORS, argb } from './timetable-export-style';
import { buildPrintGrid } from './timetable-print-grid';

export interface ExcelBranding {
    /** Logo en base64 (PNG, sans préfixe data:), ou `null`. */
    logoBase64: string | null;
    appName: string;
}

const HEADER_ROWS = 5;
const LINE_HEIGHT = 14;

const BORDER: Partial<Borders> = {
    top: { style: 'thin', color: { argb: argb(PRINT_COLORS.border) } },
    left: { style: 'thin', color: { argb: argb(PRINT_COLORS.border) } },
    bottom: { style: 'thin', color: { argb: argb(PRINT_COLORS.border) } },
    right: { style: 'thin', color: { argb: argb(PRINT_COLORS.border) } }
};

/** Nom d'onglet Excel : 31 caractères au plus, sans `\ / ? * [ ] :`, unique dans le classeur. */
export function sheetName(label: string, taken: ReadonlySet<string>): string {
    const base = label.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31).trim() || 'Horaire';
    let name = base;
    for (let index = 2; taken.has(name); index++) {
        const suffix = ` (${index})`;
        name = `${base.slice(0, 31 - suffix.length)}${suffix}`;
    }
    return name;
}

function sessionsRichText(sessions: readonly PrintSession[]): RichText[] {
    return sessions.flatMap((session, index) => [
        { text: `${index > 0 ? '\n\n' : ''}${session.course}`, font: { bold: true, color: { argb: argb(PRINT_COLORS.course) } } },
        ...(session.promotion ? [{ text: `\n${session.promotion}`, font: { color: { argb: argb(PRINT_COLORS.muted) } } }] : []),
        { text: `\n${session.professor}`, font: { italic: true, color: { argb: argb(PRINT_COLORS.professor) } } },
        { text: session.room ? `\nSalle ${session.room}` : '', font: { color: { argb: argb(PRINT_COLORS.room) } } }
    ]);
}

function styleGridCell(cell: Cell): void {
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = BORDER;
}

function fillHeader(sheet: Worksheet, timetable: PrintableTimetable, grid: PrintGrid, lastColumn: number): void {
    // Lignes 1 à 3 : « Horaire », intitulé, période, centrés au-dessus des jours ; logo en A1.
    const lines: [string, number, boolean][] = [
        ['Horaire', 18, true],
        [timetable.title, 12, false],
        [grid.period, 11, false]
    ];
    lines.forEach(([text, size, bold], index) => {
        const row = index + 1;
        sheet.mergeCells(row, 2, row, lastColumn);
        const cell = sheet.getCell(row, 2);
        cell.value = text;
        cell.font = { size, bold, color: { argb: argb(index === 2 ? PRINT_COLORS.muted : '#000000') } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    sheet.getRow(1).height = 26;

    // Ligne 4 : titre de niveau 2 (niveau — programme).
    sheet.mergeCells(4, 1, 4, lastColumn);
    const heading = sheet.getCell(4, 1);
    heading.value = timetable.heading;
    heading.font = { size: 14, bold: true };
    sheet.getRow(4).height = 24;
}

function fillGrid(sheet: Worksheet, grid: PrintGrid, lastColumn: number): void {
    let rowNumber = HEADER_ROWS + 1;

    const header = sheet.getRow(rowNumber++);
    [grid.weekLabel, ...grid.days.map((day) => day.weekday)].forEach((label, index) => {
        const cell = header.getCell(index + 1);
        cell.value = label;
        cell.font = { bold: true, color: { argb: argb(PRINT_COLORS.headerText) } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(PRINT_COLORS.header) } };
        styleGridCell(cell);
    });

    const dates = sheet.getRow(rowNumber++);
    ['-', ...grid.days.map((day) => day.label)].forEach((label, index) => {
        const cell = dates.getCell(index + 1);
        cell.value = label;
        cell.font = { bold: true };
        styleGridCell(cell);
    });

    for (const gridRow of grid.rows) {
        const row = sheet.getRow(rowNumber);
        if (gridRow.kind === 'break') {
            sheet.mergeCells(rowNumber, 1, rowNumber, lastColumn);
            row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(PRINT_COLORS.pause) } };
            row.height = 10;
            rowNumber++;
            continue;
        }
        const label = row.getCell(1);
        label.value = gridRow.label;
        label.font = { bold: true, color: { argb: argb(PRINT_COLORS.slot) } };
        styleGridCell(label);

        let lines = 2;
        gridRow.cells.forEach((sessions, index) => {
            const cell = row.getCell(index + 2);
            if (sessions.length > 0) {
                const richText = sessionsRichText(sessions);
                cell.value = { richText };
                // Hauteur de ligne selon le nombre réel de lignes de texte de la cellule.
                lines = Math.max(lines, richText.reduce((count, part) => count + (part.text.match(/\n/g)?.length ?? 0), 1));
            }
            styleGridCell(cell);
        });
        row.height = lines * LINE_HEIGHT;
        rowNumber++;
    }

    if (grid.rows.length === 0) {
        sheet.mergeCells(rowNumber, 1, rowNumber, lastColumn);
        const empty = sheet.getCell(rowNumber, 1);
        empty.value = 'Aucune séance cette semaine.';
        empty.font = { italic: true, color: { argb: argb(PRINT_COLORS.muted) } };
        empty.alignment = { horizontal: 'center' };
    }
}

/**
 * Remplit le classeur : un onglet par semaine, au format « Horaire Faculté », prêt à imprimer en
 * A4 paysage (ajusté à la largeur d'une page).
 */
export function fillWorkbook(workbook: Workbook, timetables: readonly PrintableTimetable[], branding: ExcelBranding): void {
    workbook.creator = branding.appName;
    workbook.created = new Date();
    const logo = branding.logoBase64 ? workbook.addImage({ base64: branding.logoBase64, extension: 'png' }) : null;
    const names = new Set<string>();

    for (const timetable of timetables) {
        const grid = buildPrintGrid(timetable);
        const lastColumn = grid.days.length + 1;
        const name = sheetName(`${grid.weekLabel} ${timetable.weekStart}`, names);
        names.add(name);

        const sheet = workbook.addWorksheet(name, {
            views: [{ showGridLines: false }],
            pageSetup: {
                paperSize: 9, // A4
                orientation: 'landscape',
                fitToPage: true,
                fitToWidth: 1,
                fitToHeight: 0,
                horizontalCentered: true,
                margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 }
            },
            headerFooter: { oddFooter: `${branding.appName} · &P / &N` }
        });
        sheet.getColumn(1).width = 16;
        for (let column = 2; column <= lastColumn; column++) {
            sheet.getColumn(column).width = 24;
        }

        if (logo !== null) {
            sheet.addImage(logo, { tl: { col: 0.15, row: 0.1 }, ext: { width: 64, height: 64 } });
        }
        fillHeader(sheet, timetable, grid, lastColumn);
        fillGrid(sheet, grid, lastColumn);
    }
}
