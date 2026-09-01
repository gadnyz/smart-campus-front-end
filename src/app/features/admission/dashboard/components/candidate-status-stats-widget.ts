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

    ngOnInit(): void {
        if (!this.canReadCandidates()) {
            return;
        }
    }
}
