import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, TemplateRef, computed, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ImageModule } from 'primeng/image';
import { CandidateDocument } from '../../models/candidate.model';
import { CandidateDocumentKind, resolveCandidateDocumentKind } from '../../utils/candidate-format';
import { RequiredDocument } from './candidate-dossier.model';

export interface DocumentActionsContext {
    $implicit: RequiredDocument;
}

/**
 * Pièces du dossier : fournie (aperçu, ouverture) ou manquante. Les actions propres à une page
 * (déposer, remplacer pour le candidat) passent par `actions` ; le pied de carte par projection.
 */
@Component({
    selector: 'app-candidate-dossier-documents',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ButtonModule, DatePipe, ImageModule, NgTemplateOutlet],
    template: `
        <section class="dossier-card" [id]="anchor()">
            <header class="dossier-card__header">
                <span class="dossier-card__icon"><i class="pi pi-paperclip"></i></span>
                <h3>Documents</h3>
                <span class="dossier-card__count">{{ provided() }}/{{ items().length }} pièces</span>
            </header>

            <ul class="document-list">
                @for (item of items(); track item.type) {
                    <li class="document-row" [class.document-row--missing]="!item.document">
                        <span class="document-row__thumb">
                            @if (item.document && kind(item.document) === 'image') {
                                <p-image
                                    [src]="url(item.document)"
                                    [previewImageSrc]="url(item.document)"
                                    [alt]="item.label"
                                    [preview]="true"
                                    [imageStyle]="{ width: '100%', height: '100%', objectFit: 'cover' }"
                                    (onImageError)="imageError.emit(item.document)"
                                />
                            } @else {
                                <!-- Pièce manquante : invitation au dépôt seulement si la page en propose un. -->
                                <i [class]="!item.document ? (actions() ? 'pi pi-cloud-upload' : 'pi pi-file') : kind(item.document) === 'pdf' ? 'pi pi-file-pdf' : 'pi pi-file'"></i>
                            }
                        </span>

                        <span class="document-row__text">
                            <strong>{{ item.label }}</strong>
                            @if (item.document) {
                                <small>{{ item.document.file_name || 'Fichier déposé' }} · {{ item.document.uploaded_at | date: 'dd/MM/yyyy' }}</small>
                            } @else {
                                <small class="document-row__missing">{{ missingLabel() }}</small>
                            }
                        </span>

                        <span class="document-row__actions">
                            @if (item.document) {
                                @if (kind(item.document) === 'pdf') {
                                    <button pButton type="button" icon="pi pi-eye" [text]="true" [rounded]="true" severity="secondary"
                                        [attr.aria-label]="'Prévisualiser ' + item.label" (click)="preview.emit(item.document)"></button>
                                } @else if (kind(item.document) === 'unknown') {
                                    <a pButton [href]="url(item.document)" target="_blank" rel="noopener noreferrer" icon="pi pi-external-link"
                                        [text]="true" [rounded]="true" severity="secondary" [attr.aria-label]="'Ouvrir ' + item.label"></a>
                                }
                            }
                            @if (actions(); as template) {
                                <ng-container [ngTemplateOutlet]="template" [ngTemplateOutletContext]="{ $implicit: item }" />
                            }
                        </span>
                    </li>
                }
            </ul>

            <ng-content />
        </section>
    `,
    styleUrl: './candidate-dossier-documents.scss'
})
export class CandidateDossierDocuments {
    readonly items = input.required<readonly RequiredDocument[]>();
    readonly urls = input<Record<string, string>>({});
    readonly actions = input<TemplateRef<DocumentActionsContext> | null>(null);
    readonly missingLabel = input('À fournir');
    readonly anchor = input('dossier-documents');

    readonly preview = output<CandidateDocument>();
    readonly imageError = output<CandidateDocument>();

    readonly provided = computed(() => this.items().filter((item) => item.document).length);

    url(document: CandidateDocument): string {
        return this.urls()[document.id] ?? '';
    }

    kind(document: CandidateDocument): CandidateDocumentKind {
        return resolveCandidateDocumentKind(document);
    }
}
