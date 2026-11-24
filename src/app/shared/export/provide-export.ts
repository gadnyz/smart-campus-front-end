import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { SPREADSHEET_IO } from '../import/import.model';
import { ExcelJsSpreadsheetService } from '../import/library/exceljs-spreadsheet.service';
import { EXPORT_SERVICE } from './export.service';
import { LibraryExportService } from './library/library-export.service';

/**
 * Les implémentations de l'export (PDF, Excel) et de l'import Excel pour toute l'application :
 * pdfmake et ExcelJS aujourd'hui. Changer de librairie, c'est changer ces deux lignes.
 */
export function provideExport(): EnvironmentProviders {
    return makeEnvironmentProviders([
        { provide: EXPORT_SERVICE, useExisting: LibraryExportService },
        { provide: SPREADSHEET_IO, useExisting: ExcelJsSpreadsheetService }
    ]);
}
