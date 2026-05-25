import { CommonModule } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ContextMenu } from 'primeng/contextmenu';

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
    standalone: true,
    selector: 'app-stat-card',
    imports: [CommonModule, ContextMenu],
    styleUrl: './stat-card.scss',
    host: {
        class: 'col-span-12 lg:col-span-6 xl:col-span-3'
    },
    template: `
        <div class="card stat-card mb-0" #statCard>
            <div class="stat-card-content">
                <div>
                    <span class="stat-card-label block text-muted-color font-medium">
                        {{ stat().label }}
                    </span>

                    <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">
                        @if (stat().loading) {
                            <span class="text-muted-color">...</span>
                        } @else {
                            {{ stat().value }}
                        }
                    </div>
                </div>

                <div class="stat-card-icon flex items-center justify-center rounded-border" [ngClass]="stat().iconContainerClass">
                    <i class="text-xl!" [ngClass]="[stat().icon, stat().iconClass]"></i>
                </div>
            </div>
        </div>

        <p-contextmenu [target]="statCard" [model]="menuItems()" appendTo="body" />
    `
})
export class StatCard {
    private readonly router = inject(Router);

    stat = input.required<DashboardStat>();

    menuItems = computed<MenuItem[]>(() => {
        const currentStat = this.stat();

        return [
            {
                label: 'Nouveau',
                icon: 'pi pi-plus',
                disabled: !currentStat.createRoute,
                command: () => this.navigateTo(currentStat.createRoute)
            },
            {
                label: 'Liste',
                icon: 'pi pi-list',
                disabled: !currentStat.listRoute,
                command: () => this.navigateTo(currentStat.listRoute)
            }
        ];
    });

    private navigateTo(route?: string): void {
        if (!route) {
            return;
        }

        void this.router.navigateByUrl(route);
    }
}
