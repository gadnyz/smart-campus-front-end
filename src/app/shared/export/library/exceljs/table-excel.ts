import type { Workbook } from 'exceljs';
import { TableExportDocument } from '../../export-document.model';
import { PRINT_COLORS, argb } from '../export-style';
import { ExcelBranding, sheetName } from './weekly-grid-excel';

/** Lignes avant l'en-tête du tableau : titre, sous-titre, filtres, ligne vide. */
const TITLE_ROWS = 4;

/**
 * Liste en Excel : un onglet, le titre et les filtres en tête, puis un tableau avec filtre
 * automatique et en-tête figé, prêt à retravailler.
 */
export function fillTableWorkbook(workbook: Workbook, document: TableExportDocument, branding: ExcelBranding): void {
    workbook.creator = branding.appName;
    workbook.created = new Date();
    const sheet = workbook.addWorksheet(sheetName(document.title, new Set()), {
        views: [{ state: 'frozen', ySplit: TITLE_ROWS + 1 }],
        pageSetup: { paperSize: 9, orientation: document.columns.length > 5 ? 'landscape' : 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
    });

    sheet.getCell(1, 1).value = document.title;
    sheet.getCell(1, 1).font = { size: 14, bold: true, color: { argb: argb(PRINT_COLORS.header) } };
    if (document.subtitle) {
        sheet.getCell(2, 1).value = document.subtitle;
        sheet.getCell(2, 1).font = { bold: true };
    }
    if (document.filters?.length) {
        sheet.getCell(3, 1).value = document.filters.join(' · ');
        sheet.getCell(3, 1).font = { italic: true, color: { argb: argb(PRINT_COLORS.muted) } };
    }

    const headerRow = sheet.getRow(TITLE_ROWS + 1);
    document.columns.forEach((column, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = column.label;
        cell.font = { bold: true, color: { argb: argb(PRINT_COLORS.headerText) } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(PRINT_COLORS.header) } };
    });
    document.rows.forEach((values, rowIndex) => {
        const row = sheet.getRow(TITLE_ROWS + 2 + rowIndex);
        values.forEach((value, index) => (row.getCell(index + 1).value = value));
    });

    // Largeur selon le contenu, bornée pour rester lisible.
    document.columns.forEach((column, index) => {
        const longest = Math.max(column.label.length, ...document.rows.map((row) => (row[index] ?? '').length));
        sheet.getColumn(index + 1).width = Math.min(Math.max(longest + 2, 10), 50);
    });
    if (document.columns.length > 0) {
        sheet.autoFilter = { from: { row: TITLE_ROWS + 1, column: 1 }, to: { row: TITLE_ROWS + 1 + document.rows.length, column: document.columns.length } };
    }
}
