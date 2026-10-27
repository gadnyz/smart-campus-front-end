import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DossierSection, EMPTY_VALUE } from './candidate-dossier.model';

/** Rubriques du dossier en lecture : une carte par rubrique, des paires libellé / valeur. */
@Component({
    selector: 'app-candidate-dossier-sections',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @for (section of sections(); track section.id) {
            <section class="dossier-card" [id]="idPrefix() + section.id">
                <header class="dossier-card__header">
                    <span class="dossier-card__icon"><i [class]="section.icon"></i></span>
                    <h3>{{ section.title }}</h3>
                </header>
                @for (group of section.groups; track $index) {
                    <div class="dossier-group">
                        @if (group.title) {
                            <div class="dossier-subtitle">{{ group.title }}</div>
                        }
                        <dl class="dossier-fields">
                            @for (field of group.fields; track field.label) {
                                <div [class.dossier-field--wide]="field.wide">
                                    <dt>{{ field.label }}</dt>
                                    <dd [class.dossier-field--empty]="field.value === empty">{{ field.value }}</dd>
                                </div>
                            }
                        </dl>
                    </div>
                }
            </section>
        }
    `,
    styleUrl: './candidate-dossier-sections.scss'
})
export class CandidateDossierSections {
    readonly sections = input.required<readonly DossierSection[]>();
    /** Préfixe des ancres de rubrique (`portal-identity`, `candidate-identity`…). */
    readonly idPrefix = input('dossier-');

    protected readonly empty = EMPTY_VALUE;
}
