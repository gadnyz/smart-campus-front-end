import { ChangeDetectionStrategy, Component, computed, inject, input, model } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { CandidateDocument } from '../../models/candidate.model';
import { formatCandidateDocumentType, resolveCandidateDocumentKind } from '../../utils/candidate-format';

/** Aperçu d'un PDF du dossier dans une fenêtre, avec ouverture dans un nouvel onglet. */
@Component({
    selector: 'app-candidate-document-preview',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ButtonModule, DialogModule],
    template: `
        <p-dialog
            [header]="title()"
            [visible]="visible()"
            (visibleChange)="visible.set($event)"
            [modal]="true"
            [maximizable]="true"
            [style]="{ width: '75vw' }"
            [contentStyle]="{ padding: '0' }"
            [breakpoints]="{ '960px': '92vw', '640px': '98vw' }"
        >
            @if (safeUrl(); as safe) {
                <iframe class="preview-pdf" [src]="safe" title="Document du candidat"></iframe>
            } @else {
                <div class="preview-unavailable">Prévisualisation indisponible.</div>
            }
            @if (document() && url()) {
                <div class="preview-actions">
                    <a pButton [href]="url()" target="_blank" rel="noopener noreferrer" icon="pi pi-external-link" label="Ouvrir dans un nouvel onglet"></a>
                </div>
            }
        </p-dialog>
    `,
    styles: `
        .preview-pdf {
            display: block;
            width: 100%;
            height: 72vh;
            border: 0;
        }
        .preview-unavailable {
            display: grid;
            min-height: 20rem;
            place-items: center;
            color: var(--text-color-secondary);
        }
        .preview-actions {
            display: flex;
            justify-content: flex-end;
            padding: 1rem;
            border-top: 1px solid var(--surface-border);
        }
        @media (max-width: 767px) {
            .preview-pdf {
                height: 65vh;
            }
        }
    `
})
export class CandidateDocumentPreview {
    private readonly sanitizer = inject(DomSanitizer);

    readonly document = input<CandidateDocument | null>(null);
    readonly url = input('');
    readonly visible = model(false);

    readonly title = computed(() => {
        const document = this.document();
        return document ? formatCandidateDocumentType(document.document_type) : 'Prévisualisation du document';
    });

    /** Seule une URL http(s) d'un PDF est confiée à l'iframe. */
    readonly safeUrl = computed<SafeResourceUrl | null>(() => {
        const document = this.document();
        const url = this.url();
        if (!document || !url || resolveCandidateDocumentKind(document) !== 'pdf') {
            return null;
        }
        try {
            const parsed = new URL(url, window.location.origin);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? this.sanitizer.bypassSecurityTrustResourceUrl(parsed.toString()) : null;
        } catch {
            return null;
        }
    });
}
