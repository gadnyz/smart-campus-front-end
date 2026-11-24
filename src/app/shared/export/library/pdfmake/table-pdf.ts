import type { Content, TDocumentDefinitions, TableCell } from 'pdfmake/interfaces';
import { TableExportDocument } from '../../export-document.model';
import { PRINT_COLORS } from '../export-style';
import { PdfBranding } from './weekly-grid-pdf';

/** Au-delà, la page passe en paysage pour garder des colonnes lisibles. */
const PORTRAIT_MAX_COLUMNS = 5;

/**
 * Liste imprimable : logo, titre, sous-titre et filtres actifs, puis le tableau avec son en-tête
 * répété sur chaque page. On imprime exactement ce que l'écran montre.
 */
export function buildTablePdf(document: TableExportDocument, branding: PdfBranding): TDocumentDefinitions {
    const printedAt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(branding.printedAt);
    const header: TableCell[] = document.columns.map((column) => ({ text: column.label, bold: true, color: PRINT_COLORS.headerText, fillColor: PRINT_COLORS.header }));
    const body: TableCell[][] = [header, ...document.rows.map((row) => row.map((value): TableCell => ({ text: value ?? '' })))];
    if (document.rows.length === 0) {
        body.push([{ text: 'Aucune ligne.', colSpan: document.columns.length, italics: true, color: PRINT_COLORS.muted }, ...document.columns.slice(1).map((): TableCell => ({ text: '' }))]);
    }

    const titles: Content[] = [
        { text: document.title, fontSize: 16, bold: true, color: PRINT_COLORS.header },
        ...(document.subtitle ? [{ text: document.subtitle.toLocaleUpperCase('fr-FR'), fontSize: 10, bold: true, margin: [0, 2, 0, 0] } as Content] : []),
        { text: `${document.rows.length} ligne${document.rows.length > 1 ? 's' : ''}`, fontSize: 9, color: PRINT_COLORS.muted, margin: [0, 2, 0, 0] }
    ];

    return {
        pageSize: 'A4',
        pageOrientation: document.columns.length > PORTRAIT_MAX_COLUMNS ? 'landscape' : 'portrait',
        pageMargins: [28, 24, 28, 32],
        info: { title: document.title, creator: branding.appName },
        defaultStyle: { fontSize: 9 },
        content: [
            {
                columns: [branding.logo ? { image: branding.logo, width: 48 } : { text: '', width: 48 }, { width: '*', stack: titles }],
                columnGap: 12
            },
            ...(document.filters?.length ? [{ text: document.filters.join('   ·   '), fontSize: 8, color: PRINT_COLORS.muted, margin: [0, 10, 0, 0] } as Content] : []),
            {
                margin: [0, 12, 0, 0],
                table: { headerRows: 1, widths: document.columns.map((column) => (column.width ? `${column.width * 10}%` : '*')), body },
                layout: {
                    hLineColor: () => PRINT_COLORS.border,
                    vLineColor: () => PRINT_COLORS.border,
                    hLineWidth: () => 0.5,
                    vLineWidth: () => 0.5,
                    paddingTop: () => 4,
                    paddingBottom: () => 4,
                    fillColor: (row: number) => (row > 0 && row % 2 === 0 ? '#F5F7FA' : null)
                }
            }
        ],
        footer: (currentPage, pageCount) => ({
            text: `${branding.appName} · imprimé le ${printedAt} · page ${currentPage} / ${pageCount}`,
            alignment: 'right',
            fontSize: 7,
            color: PRINT_COLORS.muted,
            margin: [28, 8, 28, 0]
        })
    };
}
