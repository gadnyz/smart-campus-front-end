import { CommonModule } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';

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
    imports: [CommonModule],
    styleUrl: './stat-card.scss',
    host: {
        class: 'col-span-12 lg:col-span-6 xl:col-span-3'
    },
    template: `
        <div
            class="card stat-card mb-0"
            [class.stat-card-clickable]="isClickable()"
            [attr.role]="isClickable() ? 'link' : null"
            [attr.tabindex]="isClickable() ? 0 : null"
            [attr.aria-label]="isClickable() ? 'Ouvrir ' + stat().label : null"
            (click)="open()"
            (keydown)="onKeydown($event)"
        >
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

                <div
                    class="stat-card-icon flex items-center justify-center rounded-border"
                    [ngClass]="stat().iconContainerClass"
                >
                    <i
                        class="text-xl!"
                        [ngClass]="[stat().icon, stat().iconClass]"
                    ></i>
                </div>
            </div>
        </div>
    `
})
export class StatCard {
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

    onKeydown(event: KeyboardEvent): void {
        if (!this.isClickable()) {
            return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.open();
        }
    }
}