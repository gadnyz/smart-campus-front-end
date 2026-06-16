import { afterNextRender, Component, effect, inject, signal } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { LayoutService } from '@/app/layout/service/layout.service';
import { OnInit } from '@angular/core';
import { UsersService } from '@/app/features/identity/users/services/user.service';
import { User } from '@/app/features/identity/users/models/user.model';
import { computed } from '@angular/core';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { IdentityPermission } from '@/app/features/identity/permissions/permission.model';

@Component({
    standalone: true,
    selector: 'app-repartition-users',
    imports: [ChartModule],
    template: `
      @if (canReadUsers()) {
        <div class="card mb-8!">
            <div class="font-semibold text-xl mb-4">Utilisateurs par profil</div>
            <p-chart type="bar" [data]="chartData()" [options]="chartOptions()" class="h-100" />
        </div>
        }
    `

})
export class RepartitionUsers implements OnInit {

    layoutService = inject(LayoutService);

    chartData = signal<any>(null);

    chartOptions = signal<any>(null);

    private readonly usersService = inject(UsersService);

    users = signal<User[]>([]);

    //
    private readonly permissionService = inject(PermissionService);

    readonly canReadUsers = computed(() =>
        this.permissionService.hasAnyPermission([IdentityPermission.UserRead, IdentityPermission.UserManage])
    );

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

    initChart() {
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--text-color');
        const borderColor = documentStyle.getPropertyValue('--surface-border');
        const textMutedColor = documentStyle.getPropertyValue('--text-color-secondary');

        const users = this.users();

        const profiles = [...new Set(users.map((user) => user.profile))];

        const activeUsersByProfile = profiles.map((profile) => users.filter((user) => user.profile === profile && user.enabled).length);

        const inactiveUsersByProfile = profiles.map((profile) => users.filter((user) => user.profile === profile && !user.enabled).length);

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
