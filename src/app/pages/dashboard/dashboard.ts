import { CommonModule, NgComponentOutlet } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { dashboardWidgets } from './dashboard.widgets';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, NgComponentOutlet],
    template: `
        <div class="grid grid-cols-12 gap-8">
            @for (widget of visibleWidgets(); track widget.key) {
                <div [class]="getWidgetClass(widget.size)">
                    <ng-container *ngComponentOutlet="widget.component" />
                </div>
            }
        </div>
    `
})
export class Dashboard {
    private readonly permissionService = inject(PermissionService);

    readonly visibleWidgets = computed(() =>
        dashboardWidgets
            .filter((widget) =>
                this.permissionService.canAccess({
                    permissions: widget.permissions,
                    mode: widget.mode
                })
            )
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    );

    getWidgetClass(size = 'full'): string {
        const classes = {
            sm: 'col-span-12 md:col-span-6 xl:col-span-3',
            md: 'col-span-12 md:col-span-6',
            lg: 'col-span-12 xl:col-span-8',
            xl: 'col-span-12',
            full: 'col-span-12'
        };

        return classes[size as keyof typeof classes] ?? classes.full;
    }
}