import { Injectable } from '@angular/core';
import type { CellValue } from 'exceljs';
import { SpreadsheetIO } from '../import.model';

type ExcelJs = typeof import('exceljs');

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Le texte d'une cellule ExcelJS, quelle que soit sa nature (date, formule, texte riche…). */
function cellText(value: CellValue): string {
    if (value === null || value === undefined) {
        return '';
    }
    if (value instanceof Date) {
        return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
    }
    if (typeof value === 'object') {
        if ('richText' in value) return value.richText.map((part) => part.text).join('');
        if ('text' in value) return String(value.text);
        if ('result' in value) return cellText(value.result as CellValue);
        return '';
    }
    return String(value);
}

/** `SpreadsheetIO` avec ExcelJS, chargé seulement au premier import. */
@Injectable({ providedIn: 'root' })
export class ExcelJsSpreadsheetService implements SpreadsheetIO {
    async readRows(file: File): Promise<string[][]> {
        const ExcelJS = await this.load();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(await file.arrayBuffer());
        const sheet = workbook.worksheets[0];
        if (!sheet) {
            return [];
        }
        const rows: string[][] = [];
        sheet.eachRow({ includeEmpty: true }, (row) => {
            const cells: string[] = [];
            for (let column = 1; column <= sheet.columnCount; column++) {
                cells.push(cellText(row.getCell(column).value).trim());
            }
            rows.push(cells);
        });
        return rows;
    }

    async downloadTemplate(fileName: string, headers: string[], example: string[]): Promise<void> {
        const ExcelJS = await this.load();
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Modèle', { views: [{ state: 'frozen', ySplit: 1 }] });
        sheet.addRow(headers).font = { bold: true };
        sheet.addRow(example).font = { italic: true, color: { argb: 'FF5B6575' } };
        headers.forEach((header, index) => (sheet.getColumn(index + 1).width = Math.max(header.length + 4, 14)));
        const buffer = await workbook.xlsx.writeBuffer();
        const url = URL.createObjectURL(new Blob([buffer], { type: XLSX_MIME }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `${fileName}.xlsx`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    private async load(): Promise<ExcelJs> {
        const module = await import('exceljs');
        return ((module as { default?: ExcelJs }).default ?? module) as ExcelJs;
    }
}
