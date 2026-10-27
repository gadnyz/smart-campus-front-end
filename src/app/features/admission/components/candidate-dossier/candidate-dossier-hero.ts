import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TagModule } from 'primeng/tag';
import { CandidateResponse } from '../../models/candidate.model';
import { CandidateAcademicLabels } from '../../services/admission-academic-reference.service';
import { candidateStatusSeverity, formatCandidatureStatus } from '../../utils/candidate-format';
import { EMPTY_VALUE, candidateFullName, candidateInitials } from './candidate-dossier.model';

/** En-tête du dossier : photo ou initiales, nom, statut, coordonnées et choix académique. */
@Component({
    selector: 'app-candidate-dossier-hero',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TagModule],
    template: `
        @let c = candidate();
        <header class="dossier-hero">
            <div class="dossier-hero__identity">
                <div class="dossier-avatar" aria-hidden="true">
                    @if (photoUrl()) {
                        <img [src]="photoUrl()" alt="" (error)="photoError.emit()" />
                    } @else {
                        <span>{{ initials() }}</span>
                    }
                </div>
                <div class="dossier-hero__text">
                    <div class="dossier-hero__title">
                        <h2>{{ fullName() }}</h2>
                        <p-tag [value]="statusLabel()" [severity]="statusSeverity()" [rounded]="true" />
                    </div>
                    <div class="dossier-hero__contact">
                        @if (c.email) {
                            <span><i class="pi pi-envelope"></i>{{ c.email }}</span>
                        }
                        @if (c.phone) {
                            <span><i class="pi pi-phone"></i>{{ c.phone }}</span>
                        }
                    </div>
                </div>
            </div>

            <dl class="dossier-facts">
                @for (fact of facts(); track fact.label) {
                    <div>
                        <dt>{{ fact.label }}</dt>
                        <dd>{{ fact.value }}</dd>
                    </div>
                }
            </dl>
        </header>
    `,
    styleUrl: './candidate-dossier-hero.scss'
})
export class CandidateDossierHero {
    readonly candidate = input.required<CandidateResponse>();
    readonly labels = input<CandidateAcademicLabels | null>(null);
    readonly photoUrl = input('');
    /** La photo signée a expiré ou ne se charge pas : à la page de renouveler l'URL. */
    readonly photoError = output<void>();

    readonly fullName = computed(() => candidateFullName(this.candidate()));
    readonly initials = computed(() => candidateInitials(this.candidate()));
    readonly statusLabel = computed(() => formatCandidatureStatus(this.candidate().candidature.status));
    readonly statusSeverity = computed(() => candidateStatusSeverity(this.candidate().candidature.status));
    readonly facts = computed(() => {
        const labels = this.labels();
        return [
            { label: 'Faculté', value: labels?.facultyLabel || EMPTY_VALUE },
            { label: 'Filière', value: labels?.programLabel || EMPTY_VALUE },
            { label: 'Promotion', value: labels?.levelLabel || EMPTY_VALUE },
            { label: 'Année académique', value: labels?.academicYearLabel || EMPTY_VALUE }
        ];
    });
}
