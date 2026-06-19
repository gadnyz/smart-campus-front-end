import { Component, OnInit, inject, signal } from '@angular/core';
import { StatCard, DashboardStat } from './stat-card/stat-card';
import { UsersService } from '@/app/features/identity/users/services/user.service';
import { computed } from '@angular/core';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { IdentityPermission } from '@/app/features/identity/permissions/permission.model';

@Component({
    standalone: true,
    selector: 'app-stats-widget',
    imports: [StatCard],
    template: `
        @if (canReadUsers()) {
            @for (stat of stats(); track stat.label) {
                <app-stat-card [stat]="stat" />
            }
        }
    `
})
export class StatsWidget implements OnInit {
    private readonly usersService = inject(UsersService);
    private readonly permissionService = inject(PermissionService);

    readonly canReadUsers = computed(() =>
        this.permissionService.hasAnyPermission([IdentityPermission.UserReadAll])
    );
    readonly stats = signal<DashboardStat[]>([
        {
            label: 'Utilisateurs',
            value: 0,
            loading: true,
            icon: 'pi pi-users',
            iconContainerClass: 'bg-blue-100 dark:bg-blue-400/10',
            iconClass: 'text-blue-500',
            createRoute: '/identity/users/new',
            listRoute: '/identity/users'
        }
    ]);

    ngOnInit(): void {
        if (this.canReadUsers()) {
            this.loadUsersCount();
        }
    }

    private loadUsersCount(): void {
        this.usersService.getUsers({ page: 0, size: 1 }).subscribe({
            next: (response) => {
                this.updateStat('Utilisateurs', {
                    value: response.total_elements,
                    loading: false
                });
            },
            error: () => {
                this.updateStat('Utilisateurs', {
                    value: '-',
                    loading: false
                });
            }
        });
    }

    private updateStat(label: string, patch: Partial<DashboardStat>): void {
        this.stats.update((stats) => stats.map((stat) => (stat.label === label ? { ...stat, ...patch } : stat)));
    }
}
