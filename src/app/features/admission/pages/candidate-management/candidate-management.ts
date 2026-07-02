import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
    Component,
    OnInit,
    computed,
    inject,
    signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import {
    PaginatorModule,
    PaginatorState
} from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';

import {
    DetailNavigationService
} from '@/app/shared/navigation/detail-navigation.service';
import {
    ContentSubtopbar,
    SubtopbarAction
} from '@/app/shared/ui/content-subtopbar/content-subtopbar';

import {
    CandidateListItem,
    CandidatureStatus,
    PagedResponse
} from '../../models/candidate.model';
import { CandidateService } from '../../services/candidate.service';
import {
    CandidateStatusSeverity,
    candidateStatusSeverity,
    formatCandidateGender,
    formatCandidatureStatus
} from '../../utils/candidate-format';

@Component({
    selector: 'app-candidate-management',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        CardModule,
        PaginatorModule,
        SelectModule,
        TableModule,
        TagModule,
        ToastModule,
        ContentSubtopbar
    ],
    templateUrl: './candidate-management.html',
    styleUrl: './candidate-management.scss',
    providers: [MessageService]
})
export class CandidateManagement implements OnInit {
    private readonly candidateService =
        inject(CandidateService);

    private readonly messageService =
        inject(MessageService);

    private readonly router = inject(Router);

    private readonly detailNavigation =
        inject(DetailNavigationService);

    private readonly navigationScope =
        'admission.candidates';

    readonly loading = signal(false);
    readonly candidates = signal<CandidateListItem[]>([]);
    readonly page = signal(0);
    readonly size = signal(10);
    readonly totalElements = signal(0);

    readonly statusFilter =
        signal<CandidatureStatus | null>(null);

    readonly statusOptions: {
        label: string;
        value: CandidatureStatus;
    }[] = [
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
            disabled: this.loading(),
            command: () =>
                this.loadCandidates(this.page())
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
                status:
                    this.statusFilter() ?? undefined
            })
            .subscribe({
                next: (response) => {
                    this.candidates.set(response.content);
                    this.page.set(response.page);
                    this.size.set(response.size);
                    this.totalElements.set(
                        response.total_elements
                    );

                    this.registerNavigationContext(response);
                    this.loading.set(false);
                },
                error: (error: unknown) => {
                    this.candidates.set([]);
                    this.totalElements.set(0);
                    this.loading.set(false);

                    this.showError(
                        this.errorDetail(
                            error,
                            'Impossible de charger les candidatures.'
                        )
                    );
                }
            });
    }

    onStatusChange(
        status: CandidatureStatus | null
    ): void {
        this.statusFilter.set(status);
        this.page.set(0);
        this.loadCandidates(0);
    }

    onPageChange(event: PaginatorState): void {
        const nextSize = event.rows ?? this.size();
        const nextPage = event.page ?? 0;

        this.size.set(nextSize);
        this.loadCandidates(nextPage);
    }

    openCandidate(candidate: CandidateListItem): void {
        void this.router.navigate([
            '/admission/candidates',
            candidate.id
        ]);
    }

    fullName(candidate: CandidateListItem): string {
        return [
            candidate.first_name,
            candidate.middle_name,
            candidate.last_name
        ]
            .filter(Boolean)
            .join(' ');
    }

    genderLabel(candidate: CandidateListItem): string {
        return formatCandidateGender(candidate.gender);
    }

    statusLabel(status: CandidatureStatus): string {
        return formatCandidatureStatus(status);
    }

    statusSeverity(
        status: CandidatureStatus
    ): CandidateStatusSeverity {
        return candidateStatusSeverity(status);
    }

    private registerNavigationContext(
        response: PagedResponse<CandidateListItem>
    ): void {
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

    private errorDetail(
        error: unknown,
        fallback: string
    ): string {
        if (error instanceof HttpErrorResponse) {
            return error.error?.detail ?? fallback;
        }

        if (error instanceof Error) {
            return error.message;
        }

        return fallback;
    }

    private showError(detail: string): void {
        this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail,
            life: 3000
        });
    }
}