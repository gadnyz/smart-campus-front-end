import { Injectable, inject } from '@angular/core';
import type { TCreatedPdf } from 'pdfmake/build/pdfmake';
import { CoreSettingsStore } from '@/app/core/settings/services/core-settings.store';
import { PrintableTimetable } from '../models/timetable-print.model';
import { fillWorkbook } from '../utils/timetable-excel';
import { buildPdfDefinition } from '../utils/timetable-pdf';
import { exportFileName } from '../utils/timetable-print-grid';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

type PdfMake = typeof import('pdfmake/build/pdfmake');
type ExcelJs = typeof import('exceljs');

/** Les modules CommonJS chargés dynamiquement arrivent soit tels quels, soit sous `default`. */
function moduleDefault<T>(module: T | { default: T }): T {
    return (module as { default?: T }).default ?? (module as T);
}

/**
 * Impression et exports (PDF, Excel) des horaires au format « Horaire Faculté ».
 *
 * <p>pdfmake (~1,5 Mo avec ses polices) et ExcelJS (~1 Mo) ne sont chargés qu'au premier export :
 * ils restent hors du bundle initial comme des chunks des pages Planification.
 */
@Injectable({ providedIn: 'root' })
export class TimetableExportService {
    private readonly brand = inject(CoreSettingsStore).brand;
    private logo?: Promise<string | null>;
    private pdfMake?: Promise<PdfMake>;

    /**
     * Ouvre le PDF dans un nouvel onglet avec la boîte d'impression. L'onglet est ouvert avant tout
     * `await` : appelée depuis un clic, la méthode échappe ainsi aux bloqueurs de fenêtres.
     */
    async print(timetables: readonly PrintableTimetable[]): Promise<void> {
        const win = window.open('', '_blank');
        if (win === null) {
            throw new Error('Le navigateur a bloqué l’ouverture de l’impression : autorisez les fenêtres pour ce site.');
        }
        try {
            await (await this.createPdf(timetables)).print(win);
        } catch (error) {
            win.close();
            throw error;
        }
    }

    async downloadPdf(timetables: readonly PrintableTimetable[]): Promise<void> {
        await (await this.createPdf(timetables)).download(`${exportFileName(timetables)}.pdf`);
    }

    async downloadExcel(timetables: readonly PrintableTimetable[]): Promise<void> {
        const [ExcelJS, logo] = await Promise.all([this.loadExcelJs(), this.loadLogo()]);
        const workbook = new ExcelJS.Workbook();
        fillWorkbook(workbook, timetables, { logoBase64: logo ? logo.split(',')[1] : null, appName: this.brand().appName });
        const buffer = await workbook.xlsx.writeBuffer();
        this.save(new Blob([buffer], { type: XLSX_MIME }), `${exportFileName(timetables)}.xlsx`);
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

    private async createPdf(timetables: readonly PrintableTimetable[]): Promise<TCreatedPdf> {
        const [pdfMake, logo] = await Promise.all([this.loadPdfMake(), this.loadLogo()]);
        return pdfMake.createPdf(buildPdfDefinition(timetables, { logo, appName: this.brand().appName, printedAt: new Date() }));
    }
}
