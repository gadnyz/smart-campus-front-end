import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { CandidateListItem, CandidatureStatus, PagedResponse } from '../../models/candidate.model';
import { CandidateService } from '../../services/candidate.service';
import {
    CandidateStatusSeverity,
    candidateStatusSeverity,
    formatCandidateGender,
    formatCandidatureStatus
} from '../../utils/candidate-format';

import { DetailNavigationService } from '@/app/shared/navigation/detail-navigation.service';



@Component({
    selector: 'app-candidate-management',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, TagModule, ToastModule, ContentSubtopbar],
    templateUrl: './candidate-management.html',
    styleUrl: './candidate-management.scss',
    providers: [MessageService]
})
export class CandidateManagement implements OnInit {
    private readonly candidateService = inject(CandidateService);
    private readonly messageService = inject(MessageService);

    readonly loading = signal(false);
    readonly candidates = signal<CandidateListItem[]>([]);
    readonly page = signal(0);
    readonly size = signal(10);
    readonly totalElements = signal(0);
    readonly totalPages = signal(0);
    readonly statusFilter = signal<CandidatureStatus | null>(null);
    private readonly router = inject(Router);
    private readonly detailNavigation = inject(DetailNavigationService);
    private readonly navigationScope = 'admission.candidates';
    readonly statusOptions: { label: string; value: CandidatureStatus | '' }[] = [
        { label: 'Tous', value: '' },
        { label: 'Brouillon', value: 'DRAFT' },
        { label: 'En attente', value: 'PENDING' },
        { label: 'Validée', value: 'VALIDATED' },
        { label: 'Rejetée', value: 'REJECTED' },
        { label: 'Annulée', value: 'CANCELLED' }
    ];

    readonly actions = computed<SubtopbarAction[]>(() => [
        {
            label: 'Actualiser',
            icon: 'pi pi-refresh',
            severity: 'secondary',
            outlined: true,
            loading: this.loading(),
            command: () => this.loadCandidates(this.page())
        }
    ]);

    ngOnInit(): void {
        this.loadCandidates(0);
    }

    loadCandidates(page: number): void {
        this.loading.set(true);

        this.candidateService
            .getAll({
                page,
                size: this.size(),
                status: this.statusFilter() ?? undefined
            })
            .subscribe({
                next: (response) => {
                    this.candidates.set(response.content);
                    this.page.set(response.page);
                    this.size.set(response.size);
                    this.totalElements.set(response.total_elements);
                    this.totalPages.set(response.total_pages);
                    this.registerNavigationContext(response);
                    this.loading.set(false);
                },
                error: (error: HttpErrorResponse) => {
                    this.loading.set(false);
                    this.showError(error.error?.detail ?? 'Impossible de charger les candidatures.');
                }
            });
    }

    onStatusChange(event: Event): void {
        const value = (event.target as HTMLSelectElement).value as CandidatureStatus | '';
        this.statusFilter.set(value || null);
        this.loadCandidates(0);
    }

    nextPage(): void {
        if (this.page() + 1 < this.totalPages()) {
            this.loadCandidates(this.page() + 1);
        }
    }

    previousPage(): void {
        if (this.page() > 0) {
            this.loadCandidates(this.page() - 1);
        }
    }

    fullName(candidate: CandidateListItem): string {
        return [candidate.first_name, candidate.middle_name, candidate.last_name].filter(Boolean).join(' ');
    }

    genderLabel(candidate: CandidateListItem): string {
        return formatCandidateGender(candidate.gender);
    }

    statusLabel(status: CandidatureStatus): string {
        return formatCandidatureStatus(status);
    }

    statusSeverity(status: CandidatureStatus): CandidateStatusSeverity {
        return candidateStatusSeverity(status);
    }

    private showError(detail: string): void {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail, life: 3000 });
    }

    openCandidate(candidate: CandidateListItem): void {
        void this.router.navigate(['/admission/candidates', candidate.id]);
    }

    private registerNavigationContext(response: PagedResponse<CandidateListItem>): void {
        this.detailNavigation.setContext({
            scope: this.navigationScope,
            listRoute: ['/admission/candidates'],
            page: response.page,
            size: response.size,
            totalElements: response.total_elements,
            totalPages: response.total_pages,
            items: response.content.map((candidate) => ({
                id: candidate.id,
                label: this.fullName(candidate)
            })),
            filters: {
                status: this.statusFilter()
            }
        });
    }
}