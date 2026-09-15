import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
    DashboardStat,
    DashboardStatCard
} from '@/app/shared/ui/dashboard/dashboard-stat-card/dashboard-stat-card';
import { FacultyService } from '../../services/faculty.service';

@Component({
    selector: 'app-faculty-stats-widget',
    standalone: true,
    imports: [DashboardStatCard],
    template: `
        <app-dashboard-stat-card [stat]="stat()" />
    `
})
export class FacultyStatsWidget implements OnInit {
    private readonly facultyService = inject(FacultyService);

    readonly totalFaculties = signal<number | string>(0);
    readonly loading = signal(true);

    readonly stat = computed<DashboardStat>(() => ({
        label: 'Facultés',
        value: this.totalFaculties(),
        loading: this.loading(),
        icon: 'pi pi-building',
        iconContainerClass: 'bg-purple-100 dark:bg-purple-400/10',
        iconClass: 'text-purple-500',
        listRoute: '/academic/faculties'
    }));

    ngOnInit(): void {
        this.facultyService.getAll().subscribe({
            next: (faculties) => {
                this.totalFaculties.set(faculties.length);
                this.loading.set(false);
            },
            error: () => {
                this.totalFaculties.set('-');
                this.loading.set(false);
            }
        });
    }
}