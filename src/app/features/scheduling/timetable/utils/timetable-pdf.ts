import type { Content, TDocumentDefinitions, TableCell } from 'pdfmake/interfaces';
import { PrintGrid, PrintSession, PrintableTimetable } from '../models/timetable-print.model';
import { PRINT_COLORS } from './timetable-export-style';
import { buildPrintGrid } from './timetable-print-grid';

export interface PdfBranding {
    /** Logo de l'université en data URL (PNG), ou `null` s'il n'a pas pu être chargé. */
    logo: string | null;
    appName: string;
    printedAt: Date;
}

const LOGO_WIDTH = 64;

function sessionCell(sessions: readonly PrintSession[]): TableCell {
    if (sessions.length === 0) {
        return { text: '' };
    }
    return {
        stack: sessions.map((session, index) => ({
            text: [
                { text: session.course, bold: true, color: PRINT_COLORS.course },
                ...(session.promotion ? ['\n', { text: session.promotion, color: PRINT_COLORS.muted }] : []),
                '\n',
                { text: session.professor, italics: true, color: PRINT_COLORS.professor },
                '\n',
                { text: session.room ? `Salle ${session.room}` : '', color: PRINT_COLORS.room }
            ],
            alignment: 'center',
            margin: [0, index === 0 ? 0 : 6, 0, 0]
        }))
    } as TableCell;
}

function gridTable(grid: PrintGrid): Content {
    const columns = grid.days.length + 1;
    const headerCell = (text: string): TableCell => ({ text, bold: true, color: PRINT_COLORS.headerText, fillColor: PRINT_COLORS.header, alignment: 'center' });

    const body: TableCell[][] = [
        [headerCell(grid.weekLabel), ...grid.days.map((day) => headerCell(day.weekday))],
        [{ text: '-', alignment: 'center', bold: true }, ...grid.days.map((day): TableCell => ({ text: day.label, alignment: 'center', bold: true }))]
    ];

    for (const row of grid.rows) {
        if (row.kind === 'break') {
            body.push([{ text: ' ', colSpan: columns, fillColor: PRINT_COLORS.pause, fontSize: 4 }, ...Array.from({ length: columns - 1 }, (): TableCell => ({ text: '' }))]);
            continue;
        }
        body.push([{ text: row.label, bold: true, color: PRINT_COLORS.slot, alignment: 'center', margin: [0, 8, 0, 8] }, ...row.cells.map(sessionCell)]);
    }

    if (grid.rows.length === 0) {
        body.push([{ text: 'Aucune séance cette semaine.', colSpan: columns, alignment: 'center', italics: true, color: PRINT_COLORS.muted, margin: [0, 12, 0, 12] }, ...Array.from({ length: columns - 1 }, (): TableCell => ({ text: '' }))]);
    }

    return {
        table: { headerRows: 2, dontBreakRows: true, widths: [64, ...grid.days.map(() => '*')], body },
        layout: {
            hLineColor: () => PRINT_COLORS.border,
            vLineColor: () => PRINT_COLORS.border,
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            paddingTop: () => 4,
            paddingBottom: () => 4
        }
    };
}

function weekPage(timetable: PrintableTimetable, grid: PrintGrid, branding: PdfBranding, first: boolean): Content[] {
    return [
        {
            // En-tête « Horaire Faculté » : logo à gauche, titre et période au centre.
            columns: [
                branding.logo ? { image: branding.logo, width: LOGO_WIDTH } : { text: '', width: LOGO_WIDTH },
                {
                    width: '*',
                    alignment: 'center',
                    stack: [
                        { text: 'Horaire', fontSize: 22, bold: true },
                        { text: timetable.title, fontSize: 12, margin: [0, 2, 0, 0] },
                        { text: grid.period, fontSize: 11, color: PRINT_COLORS.muted, margin: [0, 2, 0, 0] }
                    ]
                },
                { text: '', width: LOGO_WIDTH }
            ],
            pageBreak: first ? undefined : 'before'
        },
        { text: timetable.heading, fontSize: 15, bold: true, margin: [0, 12, 0, 10] },
        gridTable(grid)
    ];
}

/** Document pdfmake : une page A4 paysage par semaine, au format « Horaire Faculté ». */
export function buildPdfDefinition(timetables: readonly PrintableTimetable[], branding: PdfBranding): TDocumentDefinitions {
    const printedAt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(branding.printedAt);
    return {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [28, 24, 28, 32],
        info: { title: `Horaire — ${timetables[0]?.heading ?? ''}`, creator: branding.appName },
        defaultStyle: { fontSize: 9 },
        content: timetables.flatMap((timetable, index) => weekPage(timetable, buildPrintGrid(timetable), branding, index === 0)),
        footer: (currentPage, pageCount) => ({
            text: `${branding.appName} · imprimé le ${printedAt} · page ${currentPage} / ${pageCount}`,
            alignment: 'right',
            fontSize: 7,
            color: PRINT_COLORS.muted,
            margin: [28, 8, 28, 0]
        })
    };
}
