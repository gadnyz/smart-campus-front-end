import { afterNextRender, Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { LayoutService } from '@/app/layout/service/layout.service';
import { UsersService } from '@/app/features/identity/users/services/user.service';
import { User } from '@/app/features/identity/users/models/user.model';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { IdentityPermission } from '@/app/features/identity/permissions/permission.model';
import { DashboardCard } from '@/app/shared/ui/dashboard/dashboard-card/dashboard-card';

@Component({
    standalone: true,
    selector: 'app-repartition-users',
    imports: [ChartModule, DashboardCard],
    template: `
       @if (canReadUsers()) {
    <app-dashboard-card>
        <div class="font-semibold text-xl mb-4">
            Utilisateurs par profil
        </div>

        <p-chart
            type="bar"
            [data]="chartData()"
            [options]="chartOptions()"
            class="block h-100"
        />
    </app-dashboard-card>
        }
    `
})      
export class RepartitionUsers implements OnInit {
    private readonly usersService = inject(UsersService);
    private readonly permissionService = inject(PermissionService);
    readonly layoutService = inject(LayoutService);

    private readonly emptyProfileLabel = 'Sans profil';

    readonly users = signal<User[]>([]);
    readonly chartData = signal<any>(null);
    readonly chartOptions = signal<any>(null);

    readonly canReadUsers = computed(() =>
        this.permissionService.hasAnyPermission([IdentityPermission.UserReadAll])
    );

    constructor() {
        afterNextRender(() => {
            setTimeout(() => {
                this.initChart();
            }, 150);
        });

        effect(() => {
            this.layoutService.layoutConfig().darkTheme;

            setTimeout(() => {
                this.initChart();
            }, 150);
        });
    }

    ngOnInit(): void {
        if (!this.canReadUsers()) {
            return;
        }

        this.usersService.getUsers({ page: 0, size: 100 }).subscribe({
            next: (response) => {
                this.users.set(response.content);
                this.initChart();
            },
            error: () => {
                this.users.set([]);
                this.initChart();
            }
        });
    }

    private getUserProfiles(user: User): string[] {
        const profiles = Array.isArray(user.profiles) ? user.profiles.filter(Boolean) : [];

        return profiles.length ? profiles : [this.emptyProfileLabel];
    }

    initChart(): void {
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--text-color');
        const borderColor = documentStyle.getPropertyValue('--surface-border');
        const textMutedColor = documentStyle.getPropertyValue('--text-color-secondary');

        const users = this.users();
        const usersWithProfiles = users.map((user) => ({
            user,
            profiles: this.getUserProfiles(user)
        }));

        const profiles = [...new Set(usersWithProfiles.flatMap(({ profiles }) => profiles))].sort((a, b) =>
            a.localeCompare(b, 'fr')
        );

        const activeUsersByProfile = profiles.map((profile) =>
            usersWithProfiles.filter(({ user, profiles }) => user.enabled && profiles.includes(profile)).length
        );

        const inactiveUsersByProfile = profiles.map((profile) =>
            usersWithProfiles.filter(({ user, profiles }) => !user.enabled && profiles.includes(profile)).length
        );

        this.chartData.set({
            labels: profiles,
            datasets: [
                {
                    type: 'bar',
                    label: 'Actifs',
                    backgroundColor: documentStyle.getPropertyValue('--p-primary-400'),
                    data: activeUsersByProfile,
                    barThickness: 32
                },
                {
                    type: 'bar',
                    label: 'Non actifs',
                    backgroundColor: documentStyle.getPropertyValue('--p-primary-100'),
                    data: inactiveUsersByProfile,
                    borderRadius: {
                        topLeft: 8,
                        topRight: 8,
                        bottomLeft: 0,
                        bottomRight: 0
                    },
                    borderSkipped: false,
                    barThickness: 32
                }
            ]
        });

        this.chartOptions.set({
            maintainAspectRatio: false,
            aspectRatio: 0.8,
            plugins: {
                legend: {
                    labels: {
                        color: textColor
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    ticks: {
                        color: textMutedColor
                    },
                    grid: {
                        color: 'transparent',
                        borderColor: 'transparent'
                    }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: {
                        color: textMutedColor,
                        stepSize: 1,
                        precision: 0
                    },
                    grid: {
                        color: borderColor,
                        borderColor: 'transparent',
                        drawTicks: false
                    }
                }
            }
        });
    }
}