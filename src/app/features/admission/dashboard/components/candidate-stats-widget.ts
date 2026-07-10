import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
    DashboardStat,
    DashboardStatCard
} from '@/app/shared/ui/dashboard/dashboard-stat-card/dashboard-stat-card';
import { CandidateService } from '../../services/candidate.service';

@Component({
    selector: 'app-candidate-stats-widget',
    standalone: true,
    imports: [DashboardStatCard],
    template: `
        <app-dashboard-stat-card [stat]="stat()" />
    `
})
export class CandidateStatsWidget implements OnInit {
    private readonly candidateService = inject(CandidateService);

    readonly totalCandidates = signal<number | string>(0);
    readonly loading = signal(true);

    readonly stat = computed<DashboardStat>(() => ({
        label: 'Candidatures',
        value: this.totalCandidates(),
        loading: this.loading(),
        icon: 'pi pi-file-edit',
        iconContainerClass: 'bg-orange-100 dark:bg-orange-400/10',
        iconClass: 'text-orange-500',
        listRoute: '/admission/candidates'
    }));

    ngOnInit(): void {
        this.candidateService.getAll({ page: 0, size: 1 }).subscribe({
            next: (response) => {
                this.totalCandidates.set(response.total_elements);
                this.loading.set(false);
            },
            error: () => {
                this.totalCandidates.set('-');
                this.loading.set(false);
            }
        });
    }
}