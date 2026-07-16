import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ChartModule } from 'primeng/chart';

import { PermissionService } from '@/app/core/permissions/permission.service';
import { DashboardCard } from '@/app/shared/ui/dashboard/dashboard-card/dashboard-card';
import {
    DashboardStat,
    DashboardStatCard
} from '@/app/shared/ui/dashboard/dashboard-stat-card/dashboard-stat-card';

import { CandidatureStatus } from '../../models/candidate.model';
import { AdmissionPermission } from '../../permissions/permission.model';
import { CandidateService } from '../../services/candidate.service';
import { formatCandidatureStatus } from '../../utils/candidate-format';

@Component({
    selector: 'app-candidate-status-stats-widget',
    standalone: true,
    imports: [CommonModule, ChartModule, DashboardCard, DashboardStatCard],
    template: `
        @if (canReadCandidates()) {
            <div class="candidate-status-stats">
                <div class="candidate-status-stats__cards">
                    @for (stat of statusStats(); track stat.label) {
                        <app-dashboard-stat-card [stat]="stat" />
                    }
                </div>

                <app-dashboard-card>
                    <div class="font-semibold text-xl mb-4">
                        Candidatures par statut
                    </div>

                    @if (loading()) {
                        <div class="text-color-secondary">Chargement…</div>
                    } @else {
                        <p-chart
                            type="doughnut"
                            [data]="chartData()"
                            [options]="chartOptions"
                            class="block w-full"
                            style="max-height: 18rem"
                        />
                    }
                </app-dashboard-card>
            </div>
        }
    `,
    styles: `
        :host {
            display: block;
        }

        .candidate-status-stats {
            display: grid;
            gap: 1rem;
        }

        .candidate-status-stats__cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
            gap: 1rem;
        }
    `
})
export class CandidateStatusStatsWidget implements OnInit {
    private readonly candidateService = inject(CandidateService);
    private readonly permissionService = inject(PermissionService);

    readonly loading = signal(true);
    readonly statusStats = signal<DashboardStat[]>([]);
    readonly chartData = signal<Record<string, unknown> | null>(null);

    readonly canReadCandidates = computed(() =>
        this.permissionService.hasAnyPermission([
            AdmissionPermission.AdmissionCandidateReadAll
        ])
    );

    readonly chartOptions = {
        cutout: '58%',
        plugins: {
            legend: {
                position: 'bottom' as const
            }
        }
    };

    private readonly statusMeta: Array<{
        status: CandidatureStatus;
        icon: string;
        iconContainerClass: string;
        iconClass: string;
        color: string;
        hoverColor: string;
    }> = [
        {
            status: 'PENDING',
            icon: 'pi pi-clock',
            iconContainerClass: 'bg-orange-100 dark:bg-orange-400/10',
            iconClass: 'text-orange-500',
            color: '#f97316',
            hoverColor: '#ea580c'
        },
        {
            status: 'VALIDATED',
            icon: 'pi pi-check-circle',
            iconContainerClass: 'bg-green-100 dark:bg-green-400/10',
            iconClass: 'text-green-500',
            color: '#22c55e',
            hoverColor: '#16a34a'
        },
        {
            status: 'REJECTED',
            icon: 'pi pi-times-circle',
            iconContainerClass: 'bg-red-100 dark:bg-red-400/10',
            iconClass: 'text-red-500',
            color: '#ef4444',
            hoverColor: '#dc2626'
        },
        {
            status: 'DRAFT',
            icon: 'pi pi-file',
            iconContainerClass: 'bg-slate-100 dark:bg-slate-400/10',
            iconClass: 'text-slate-500',
            color: '#94a3b8',
            hoverColor: '#64748b'
        },
        {
            status: 'CANCELLED',
            icon: 'pi pi-ban',
            iconContainerClass: 'bg-violet-100 dark:bg-violet-400/10',
            iconClass: 'text-violet-500',
            color: '#8b5cf6',
            hoverColor: '#7c3aed'
        }
    ];

    ngOnInit(): void {
        if (!this.canReadCandidates()) {
            return;
        }

        forkJoin(
            this.statusMeta.map((meta) =>
                this.candidateService
                    .getAll({ page: 0, size: 1, status: meta.status })
                    .pipe(
                        catchError(() =>
                            of({
                                content: [],
                                page: 0,
                                size: 1,
                                total_elements: 0,
                                total_pages: 0
                            })
                        )
                    )
            )
        ).subscribe({
            next: (responses) => {
                const counts = this.statusMeta.map((meta, index) => ({
                    label: formatCandidatureStatus(meta.status),
                    value: responses[index].total_elements,
                    loading: false,
                    icon: meta.icon,
                    iconContainerClass: meta.iconContainerClass,
                    iconClass: meta.iconClass,
                    listRoute: `/admission/candidates?status=${meta.status}`,
                    color: meta.color,
                    hoverColor: meta.hoverColor
                }));

                this.statusStats.set(counts);
                this.chartData.set({
                    labels: counts.map((item) => item.label),
                    datasets: [
                        {
                            data: counts.map((item) => item.value),
                            backgroundColor: counts.map((item) => item.color),
                            hoverBackgroundColor: counts.map(
                                (item) => item.hoverColor
                            )
                        }
                    ]
                });
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
            }
        });
    }
}
