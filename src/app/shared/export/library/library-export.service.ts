import { Injectable, inject } from '@angular/core';
import type { TCreatedPdf } from 'pdfmake/build/pdfmake';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import type { Workbook } from 'exceljs';
import { CoreSettingsStore } from '@/app/core/settings/services/core-settings.store';
import { ExportDocument } from '../export-document.model';
import { ExportService } from '../export.service';
import { fillTableWorkbook } from './exceljs/table-excel';
import { ExcelBranding, fillWeeklyGridWorkbook } from './exceljs/weekly-grid-excel';
import { buildTablePdf } from './pdfmake/table-pdf';
import { PdfBranding, buildWeeklyGridPdf } from './pdfmake/weekly-grid-pdf';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

type PdfMake = typeof import('pdfmake/build/pdfmake');
type ExcelJs = typeof import('exceljs');

/** Les modules CommonJS chargés dynamiquement arrivent soit tels quels, soit sous `default`. */
function moduleDefault<T>(module: T | { default: T }): T {
    return (module as { default?: T }).default ?? (module as T);
}

/**
 * `ExportService` avec pdfmake (PDF, impression) et ExcelJS (classeurs). C'est le seul endroit de
 * l'application qui connaît ces librairies.
 *
 * <p>pdfmake (~1,5 Mo avec ses polices) et ExcelJS (~1 Mo) ne sont chargés qu'au premier export :
 * ils restent hors du bundle initial.
 */
@Injectable({ providedIn: 'root' })
export class LibraryExportService implements ExportService {
    private readonly brand = inject(CoreSettingsStore).brand;
    private logo?: Promise<string | null>;
    private pdfMake?: Promise<PdfMake>;

    async print(document: ExportDocument): Promise<void> {
        // Ouvert avant tout await : le bloqueur de fenêtres voit encore le geste de l'utilisateur.
        const win = window.open('', '_blank');
        if (win === null) {
            throw new Error('Le navigateur a bloqué l’ouverture de l’impression : autorisez les fenêtres pour ce site.');
        }
        try {
            await (await this.createPdf(document)).print(win);
        } catch (error) {
            win.close();
            throw error;
        }
    }

    async downloadPdf(document: ExportDocument): Promise<void> {
        await (await this.createPdf(document)).download(`${document.fileName}.pdf`);
    }

    async downloadExcel(document: ExportDocument): Promise<void> {
        const [ExcelJS, logo] = await Promise.all([this.loadExcelJs(), this.loadLogo()]);
        const workbook = new ExcelJS.Workbook();
        this.fillWorkbook(workbook, document, { logoBase64: logo ? logo.split(',')[1] : null, appName: this.brand().appName });
        const buffer = await workbook.xlsx.writeBuffer();
        this.save(new Blob([buffer], { type: XLSX_MIME }), `${document.fileName}.xlsx`);
    }

    // ----- Rendus -----

    private definition(document: ExportDocument, branding: PdfBranding): TDocumentDefinitions {
        return document.kind === 'table' ? buildTablePdf(document, branding) : buildWeeklyGridPdf(document.pages, document.documentTitle, branding);
    }

    private fillWorkbook(workbook: Workbook, document: ExportDocument, branding: ExcelBranding): void {
        if (document.kind === 'table') {
            fillTableWorkbook(workbook, document, branding);
        } else {
            fillWeeklyGridWorkbook(workbook, document.pages, branding);
        }
    }

    private async createPdf(document: ExportDocument): Promise<TCreatedPdf> {
        const [pdfMake, logo] = await Promise.all([this.loadPdfMake(), this.loadLogo()]);
        return pdfMake.createPdf(this.definition(document, { logo, appName: this.brand().appName, printedAt: new Date() }));
    }

    // ----- Chargements à la demande (surchargés dans les tests) -----

    protected loadPdfMake(): Promise<PdfMake> {
        this.pdfMake ??= Promise.all([import('pdfmake/build/pdfmake'), import('pdfmake/build/vfs_fonts')]).then(([pdfMakeModule, vfsModule]) => {
            const pdfMake = moduleDefault(pdfMakeModule) as PdfMake;
            pdfMake.addVirtualFileSystem(moduleDefault(vfsModule));
            return pdfMake;
        });
        return this.pdfMake;
    }

    protected async loadExcelJs(): Promise<ExcelJs> {
        return moduleDefault(await import('exceljs')) as ExcelJs;
    }

    /** Logo de l'université en data URL ; un logo introuvable n'empêche pas l'export. */
    protected loadLogo(): Promise<string | null> {
        this.logo ??= fetch(this.brand().logos.main)
            .then((response) => (response.ok ? response.blob() : Promise.reject(new Error(String(response.status)))))
            .then(
                (blob) =>
                    new Promise<string | null>((resolve) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
                        reader.onerror = () => resolve(null);
                        reader.readAsDataURL(blob);
                    })
            )
            .catch(() => null);
        return this.logo;
    }

    protected save(blob: Blob, fileName: string): void {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
}
