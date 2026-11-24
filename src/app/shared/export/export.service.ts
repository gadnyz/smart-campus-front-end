import { InjectionToken } from '@angular/core';
import { ExportDocument } from './export-document.model';

/**
 * Impression et exports, quelle que soit la librairie. Les modules métier injectent
 * `EXPORT_SERVICE` et ne connaissent que cette interface : changer de librairie revient à fournir
 * une autre implémentation (voir `provideExport`).
 */
export interface ExportService {
    /**
     * Ouvre le PDF dans un nouvel onglet avec la boîte d'impression. À appeler directement depuis
     * un clic : l'onglet s'ouvre avant tout traitement, pour échapper aux bloqueurs de fenêtres.
     */
    print(document: ExportDocument): Promise<void>;
    downloadPdf(document: ExportDocument): Promise<void>;
    downloadExcel(document: ExportDocument): Promise<void>;
}

export const EXPORT_SERVICE = new InjectionToken<ExportService>('EXPORT_SERVICE');

/** Nom de fichier lisible et sûr : « liste-des-etudiants-2026-11-24 ». */
export function exportSlug(...parts: string[]): string {
    return parts
        .join('-')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
