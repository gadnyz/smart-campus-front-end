import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DetailNavigationContext, DetailNavigationService } from '@/app/shared/navigation/detail-navigation.service';

import { CommonModule, Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { CandidateResponse, CandidatureStatus, CandidateListItem } from '../../models/candidate.model';
import { CandidateService } from '../../services/candidate.service';
import { AdmissionAcademicReferenceService, CandidateAcademicLabels } from '../../services/admission-academic-reference.service';
import {
    CandidateStatusSeverity,
    candidateStatusSeverity,
    formatCandidateDate,
    formatCandidateDateTime,
    formatCandidateGender,
    formatCandidatureStatus,
    formatCandidatureType,
    formatMaritalStatus
} from '../../utils/candidate-format';

type CandidateDetailRow = {
    label: string;
    value: string | number | null | undefined;
};

@Component({
    selector: 'app-candidate-detail',
    standalone: true,
    imports: [CommonModule, ButtonModule, TagModule, ToastModule, ConfirmDialogModule, ContentSubtopbar],
    templateUrl: './candidate-detail.html',
    styleUrl: './candidate-detail.scss',
    providers: [ConfirmationService, MessageService]
})

export class CandidateDetail implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly candidateService = inject(CandidateService);
    private readonly messageService = inject(MessageService);
    private readonly confirmationService = inject(ConfirmationService);
    readonly loading = signal(false);
    readonly actionLoading = signal(false);
    readonly candidate = signal<CandidateResponse | null>(null);
    private readonly academicReferenceService = inject(AdmissionAcademicReferenceService);
    readonly academicLabels = signal<CandidateAcademicLabels | null>(null);
    private readonly destroyRef = inject(DestroyRef);
    private readonly detailNavigation = inject(DetailNavigationService);
    private readonly navigationScope = 'admission.candidates';

    readonly actions = computed<SubtopbarAction[]>(() => {
        const actions: SubtopbarAction[] = [
            {
                label: 'Liste',
                icon: 'pi pi-list',
                severity: 'secondary',
                outlined: false,
                command: () => this.goToList()
            }
        ];

        if (this.canGoPrevious()) {
            actions.push({
                label: 'Précédent',
                icon: 'pi pi-chevron-left',
                severity: 'secondary',
                outlined: true,
                disabled: this.actionLoading(),
                command: () => this.goToPreviousCandidate()
            });
        }

        if (this.canGoNext()) {
            actions.push({
                label: 'Suivant',
                icon: 'pi pi-chevron-right',
                severity: 'secondary',
                outlined: true,
                disabled: this.actionLoading(),
                command: () => this.goToNextCandidate()
            });
        }

        if (this.canValidate()) {
            actions.push({
                label: 'Valider',
                icon: 'pi pi-check',
                severity: 'success',
                outlined: false,
                disabled: this.actionLoading(),
                loading: this.actionLoading(),
                command: () => this.confirmValidate()
            });
        }

        if (this.canReject()) {
            actions.push({
                label: 'Rejeter',
                icon: 'pi pi-times',
                severity: 'danger',
                outlined: false,
                disabled: this.actionLoading(),
                command: () => this.confirmReject()
            });
        }

        return actions;
    });

    ngOnInit(): void {
        this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
            this.loadCandidate(params.get('id'));
        });
    }

    loadCandidate(id: string | null): void {
        if (!id) {
            this.showError('Identifiant candidature introuvable.');
            this.goToList();
            return;
        }

        this.loading.set(true);
        this.candidate.set(null);
        this.academicLabels.set(null);

        this.candidateService.getById(id).subscribe({
            next: (candidate) => {
                this.candidate.set(candidate);
                this.loading.set(false);
                this.loadAcademicLabels(candidate);
            },
            error: (error: HttpErrorResponse) => {
                this.loading.set(false);
                this.showError(error.error?.detail ?? 'Impossible de charger la candidature.');
            }
        });
    }

    private loadAcademicLabels(candidate: CandidateResponse): void {
        this.academicReferenceService.resolveCandidateLabels(candidate).subscribe({
            next: (labels) => this.academicLabels.set(labels),
            error: () =>
                this.academicLabels.set({
                    academicYearLabel: candidate.academic_year_id,
                    facultyLabel: candidate.faculty_id,
                    programLabel: candidate.program_id,
                    levelLabel: candidate.level_id
                })
        });
    }

    confirmValidate(): void {
        const candidate = this.candidate();

        if (!candidate || !this.canValidate()) {
            return;
        }

        this.confirmationService.confirm({
            message: `Voulez-vous vraiment valider la candidature de ${this.fullName(candidate)} ?`,
            header: 'Confirmation',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Valider',
            rejectLabel: 'Annuler',
            acceptButtonStyleClass: 'p-button-success',
            rejectButtonStyleClass: 'p-button-secondary',
            accept: () => this.validateCandidate(candidate.id)
        });
    }

    private validateCandidate(candidateId: string): void {
        this.actionLoading.set(true);

        this.candidateService.validate(candidateId).subscribe({
            next: () => {
                this.actionLoading.set(false);
                this.goToNextCandidateOrList();
            },
            error: (error: HttpErrorResponse) => {
                this.actionLoading.set(false);
                this.showError(error.error?.detail ?? 'Impossible de valider la candidature.');
            }
        });
    }

    confirmReject(): void {
        const candidate = this.candidate();

        if (!candidate || !this.canReject()) {
            return;
        }

        this.confirmationService.confirm({
            message: `Voulez-vous vraiment rejeter la candidature de ${this.fullName(candidate)} ?`,
            header: 'Confirmation',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Rejeter',
            rejectLabel: 'Annuler',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-secondary',
            accept: () => this.rejectCandidate(candidate.id)
        });
    }

    private rejectCandidate(candidateId: string): void {
        this.actionLoading.set(true);

        this.candidateService.reject(candidateId).subscribe({
            next: () => {
                this.actionLoading.set(false);
                this.goToNextCandidateOrList();
            },
            error: (error: HttpErrorResponse) => {
                this.actionLoading.set(false);
                this.showError(error.error?.detail ?? 'Impossible de rejeter la candidature.');
            }
        });
    }

    private currentStatus(): CandidatureStatus | null {
        return this.candidate()?.candidature?.status ?? null;
    }

    canValidate(): boolean {
        const status = this.currentStatus();
        return status === 'DRAFT' || status === 'PENDING';
    }

    canReject(): boolean {
        const status = this.currentStatus();
        return status === 'DRAFT' || status === 'PENDING';
    }

    fullName(candidate: CandidateResponse): string {
        return [candidate.first_name, candidate.middle_name, candidate.last_name].filter(Boolean).join(' ');
    }


    statusLabel(status: CandidatureStatus): string {
        return formatCandidatureStatus(status);
    }

    statusSeverity(status: CandidatureStatus): CandidateStatusSeverity {
        return candidateStatusSeverity(status);
    }

    private showSuccess(detail: string): void {
        this.messageService.add({ severity: 'success', summary: 'Succès', detail, life: 3000 });
    }

    private showError(detail: string): void {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail, life: 3000 });
    }

    readonly studentRows = computed<CandidateDetailRow[]>(() => {
        const candidate = this.candidate();

        if (!candidate) {
            return [];
        }

        return [
            { label: 'Prénom', value: candidate.first_name },
            { label: 'Nom', value: candidate.last_name },
            { label: 'Post-nom', value: candidate.middle_name },
            { label: 'Genre', value: formatCandidateGender(candidate.gender) },
            { label: 'Date de naissance', value: formatCandidateDate(candidate.birth_date) },
            { label: 'Lieu de naissance', value: candidate.birth_place },
            { label: 'État civil', value: formatMaritalStatus(candidate.marital_status) },
            { label: 'Nationalité', value: candidate.nationality },
            { label: 'Email', value: candidate.email },
            { label: 'Téléphone', value: candidate.phone }
        ];
    });

    readonly admissionRows = computed<CandidateDetailRow[]>(() => {
        const candidate = this.candidate();
        const labels = this.academicLabels();

        if (!candidate) {
            return [];
        }

        return [
            { label: 'Type candidature', value: formatCandidatureType(candidate.candidature.type) },
            { label: 'Soumise le', value: formatCandidateDateTime(candidate.candidature.submitted_at) },
            { label: 'Année académique', value: labels?.academicYearLabel ?? candidate.academic_year_id },
            { label: 'Faculté', value: labels?.facultyLabel ?? candidate.faculty_id },
            { label: 'Programme', value: labels?.programLabel ?? candidate.program_id },
            { label: 'Niveau', value: labels?.levelLabel ?? candidate.level_id }
        ];
    });

    readonly academicRows = computed<CandidateDetailRow[]>(() => {
        const candidate = this.candidate();

        if (!candidate) {
            return [];
        }

        return [
            { label: 'École', value: candidate.academic_background.school_name },
            { label: 'Option', value: candidate.academic_background.option },
            { label: 'Pourcentage', value: `${candidate.academic_background.percentage}%` },
            { label: 'Année', value: candidate.academic_background.graduation_year },
            { label: 'Pays', value: candidate.academic_background.study_country },
            { label: 'Ville', value: candidate.academic_background.study_city }
        ];
    });

    readonly originRows = computed<CandidateDetailRow[]>(() => {
        const candidate = this.candidate();

        if (!candidate) {
            return [];
        }

        return [
            { label: 'Province', value: candidate.origin.province },
            { label: 'Territoire', value: candidate.origin.territory },
            { label: 'Secteur', value: candidate.origin.sector },
            { label: 'Commune', value: candidate.origin.commune }
        ];
    });

    readonly tutorRows = computed<CandidateDetailRow[]>(() => {
        const candidate = this.candidate();

        if (!candidate) {
            return [];
        }

        return [
            { label: 'Nom', value: candidate.tutor.full_name },
            { label: 'Email', value: candidate.tutor.email },
            { label: 'Téléphone', value: candidate.tutor.phone },
            { label: 'Profession', value: candidate.tutor.profession }
        ];
    });

    readonly emergencyRows = computed<CandidateDetailRow[]>(() => {
        const candidate = this.candidate();

        if (!candidate) {
            return [];
        }

        return [
            { label: 'Nom', value: candidate.emergency_contact.full_name },
            { label: 'Email', value: candidate.emergency_contact.email },
            { label: 'Téléphone', value: candidate.emergency_contact.phone },
            { label: 'Lien', value: candidate.emergency_contact.relationship }
        ];
    });

    readonly navigationState = computed(() => {
        const candidate = this.candidate();

        return candidate ? this.detailNavigation.getState(this.navigationScope, candidate.id) : null;
    });

    readonly navigationLabel = computed(() => this.navigationState()?.label ?? '');

    readonly canGoPrevious = computed(() => this.navigationState()?.hasPrevious ?? false);

    readonly canGoNext = computed(() => this.navigationState()?.hasNext ?? false);

    readonly pageTitle = computed(() => {
        const label = this.navigationLabel();

        return label ? `Détail candidature (${label})` : 'Détail candidature';
    });
    displayValue(value: string | number | null | undefined): string {
        return value === null || value === undefined || value === '' ? '-' : String(value);
    }

    goToList(): void {
        void this.router.navigate(['/admission/candidates'], {
            queryParams: { refreshedAt: Date.now() }
        });
    }

    goToPreviousCandidate(): void {
        const state = this.navigationState();

        if (!state) {
            return;
        }

        const previous = state.context.items[state.localIndex - 1];

        if (previous) {
            this.navigateToCandidate(previous.id);
            return;
        }

        this.loadNavigationPage(state.context, state.context.page - 1, 'last');
    }

    goToNextCandidate(): void {
        const state = this.navigationState();

        if (!state) {
            return;
        }

        const next = state.context.items[state.localIndex + 1];

        if (next) {
            this.navigateToCandidate(next.id);
            return;
        }

        this.loadNavigationPage(state.context, state.context.page + 1, 'first');
    }

    private goToNextCandidateOrList(): void {
        if (this.canGoNext()) {
            this.goToNextCandidate();
            return;
        }

        this.goToList();
    }

    private navigateToCandidate(candidateId: string): void {
        void this.router.navigate(['/admission/candidates', candidateId]);
    }

    private loadNavigationPage(context: DetailNavigationContext, page: number, target: 'first' | 'last'): void {
        if (page < 0 || page >= context.totalPages) {
            this.goToList();
            return;
        }

        this.actionLoading.set(true);

        this.candidateService
            .getAll({
                page,
                size: context.size,
                status: (context.filters?.['status'] as CandidatureStatus | null) ?? undefined
            })
            .subscribe({
                next: (response) => {
                    this.actionLoading.set(false);

                    this.detailNavigation.setContext({
                        ...context,
                        page: response.page,
                        size: response.size,
                        totalElements: response.total_elements,
                        totalPages: response.total_pages,
                        items: response.content.map((candidate: CandidateListItem) => ({
                            id: candidate.id,
                            label: this.fullName(candidate as unknown as CandidateResponse)
                        }))
                    });

                    const candidate = target === 'first' ? response.content[0] : response.content[response.content.length - 1];

                    if (!candidate) {
                        this.goToList();
                        return;
                    }

                    this.navigateToCandidate(candidate.id);
                },
                error: () => {
                    this.actionLoading.set(false);
                    this.goToList();
                }
            });
    }
}