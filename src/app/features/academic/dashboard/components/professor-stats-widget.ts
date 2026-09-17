import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
    DashboardStat,
    DashboardStatCard
} from '@/app/shared/ui/dashboard/dashboard-stat-card/dashboard-stat-card';
import { ProfessorService } from '../../services/professor.service';

@Component({
    selector: 'app-professor-stats-widget',
    standalone: true,
    imports: [DashboardStatCard],
    template: `
        <app-dashboard-stat-card [stat]="stat()" />
    `
})
export class ProfessorStatsWidget implements OnInit {
    private readonly professorService = inject(ProfessorService);

    readonly totalProfessors = signal<number | string>(0);
    readonly loading = signal(true);

    readonly stat = computed<DashboardStat>(() => ({
        label: 'Professeurs',
        value: this.totalProfessors(),
        loading: this.loading(),
        icon: 'pi pi-users',
        iconContainerClass: 'bg-teal-100 dark:bg-teal-400/10',
        iconClass: 'text-teal-500',
        listRoute: '/academic/professors'
    }));

    ngOnInit(): void {
        this.professorService.getAll().subscribe({
            next: (professors) => {
                this.totalProfessors.set(professors.length);
                this.loading.set(false);
            },
            error: () => {
                this.totalProfessors.set('-');
                this.loading.set(false);
            }
        });
    }
}
