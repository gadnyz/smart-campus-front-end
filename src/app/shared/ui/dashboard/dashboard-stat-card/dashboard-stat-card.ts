import { CommonModule } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { DashboardCard } from '../dashboard-card/dashboard-card';

export type DashboardStat = {
    label: string;
    value: string | number;
    loading?: boolean;
    icon: string;
    iconContainerClass: string;
    iconClass: string;
    createRoute?: string;
    listRoute?: string;
};

@Component({
    selector: 'app-dashboard-stat-card',
    imports: [CommonModule, DashboardCard],
    standalone: true,
    templateUrl: './dashboard-stat-card.html',
    styleUrl: './dashboard-stat-card.scss'
})
export class DashboardStatCard {
    private readonly router = inject(Router);

    readonly stat = input.required<DashboardStat>();

    isClickable(): boolean {
        return !!(this.stat().listRoute || this.stat().createRoute);
    }

    open(): void {
        const route = this.stat().listRoute ?? this.stat().createRoute;

        if (route) {
            void this.router.navigateByUrl(route);
        }
    }
}
