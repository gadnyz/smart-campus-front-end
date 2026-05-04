import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { LayoutService } from '@/app/layout/service/layout.service';
import { appBrand } from '@/app/core/config/app-brand';
import { finalize } from 'rxjs';
import { AuthService } from '@/app/core/auth/services/auth.service';
@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [
        RouterModule,
        CommonModule,
        ButtonModule,
        MenuModule,
        AvatarModule,
        BadgeModule
    ],
    template: `
        <header class="layout-topbar">
            <div class="layout-topbar-left">
                <button
                    type="button"
                    class="layout-menu-button layout-topbar-action"
                    (click)="layoutService.onMenuToggle()"
                >
                    <i class="pi pi-bars"></i>
                </button>

                <a class="layout-topbar-logo" routerLink="/">
                    <img [src]="brand.logos.main" [alt]="brand.appName" />
                    <span>{{ brand.appName }}</span>
                </a>
            </div>

            <div class="layout-topbar-right">
                <button
                    type="button"
                    class="layout-topbar-action layout-topbar-action-badge"
                    aria-label="Notifications"
                >
                    <i class="pi pi-bell"></i>
                    <p-badge
                        [value]="notificationCount.toString()"
                        severity="danger"
                        styleClass="layout-topbar-notification-badge"
                    />
                </button>

                <p-menu
                    #notificationsMenu
                    [model]="notificationMenuItems"
                    [popup]="true"
                    appendTo="body"
                    styleClass="layout-topbar-notification-menu"
                />

                <button
                    type="button"
                    class="layout-topbar-action"
                    (click)="toggleDarkMode()"
                    aria-label="Thème"
                >
                    <i [ngClass]="{ pi: true, 'pi-moon': !layoutService.isDarkTheme(), 'pi-sun': layoutService.isDarkTheme() }"></i>
                </button>

                <button
                    type="button"
                    class="layout-topbar-user"
                    aria-label="Profil utilisateur"
                    (click)="userMenu.toggle($event)"
                >
                    <p-avatar
                        label="G"
                        shape="circle"
                        styleClass="layout-topbar-avatar"
                    />
                    <span class="layout-topbar-user-label">Gad</span>
                    <i class="pi pi-angle-down layout-topbar-user-chevron"></i>
                </button>

                <p-menu
                    #userMenu
                    [model]="userMenuItems"
                    [popup]="true"
                    appendTo="body"
                    styleClass="layout-topbar-user-menu"
                />
            </div>
        </header>
    `
})
export class AppTopbar {
    readonly brand = appBrand;
    readonly layoutService = inject(LayoutService);
    private readonly router = inject(Router);
    private readonly authService = inject(AuthService);

    readonly notificationCount = 5;

    readonly notificationMenuItems: MenuItem[] = [
        {
            label: 'Nouvelle demande de création utilisateur',
            icon: '',
            command: () => {
                void this.router.navigate(['/identity/users/new']);
            }
        },
        {
            label: 'Mot de passe réinitialisé avec succès',
            icon: '',
            command: () => {
                void this.router.navigate(['/identity/users']);
            }
        },
        {
            label: 'Profil mis à jour',
            icon: '',
            command: () => {
                void this.router.navigate(['/identity/profile']);
            }
        },
        {
            label: 'Préférences modifiées',
            icon: 'g',
            command: () => {
                void this.router.navigate(['/identity/preferences']);
            }
        },
        {
            label: 'Nouvelle connexion détectée',
            icon: '',
            command: () => {
                void this.router.navigate(['/identity/profile']);
            }
        }
    ];

    readonly userMenuItems: MenuItem[] = [
        {
            label: 'Profil',
            icon: 'pi pi-user',
            command: () => {
                void this.router.navigate(['/identity/profile']);
            }
        },
        {
            label: 'Préférences',
            icon: 'pi pi-cog',
            command: () => {
                void this.router.navigate(['/identity/preferences']);
            }
        },
        {
            separator: true
        },
        {
            label: 'Se déconnecter',
            icon: 'pi pi-sign-out',
            command: () => this.logout()
        }
    ];

    toggleDarkMode(): void {
        this.layoutService.layoutConfig.update((state) => ({
            ...state,
            darkTheme: !state.darkTheme
        }));
    }

    logout(): void {
        const payload = this.authService.getLogoutPayload();

        if (!payload) {
            this.authService.clearSession();
            void this.router.navigate(['/auth/login']);
            return;
        }

        this.authService
            .logoutRequest(payload)
            .pipe(
                finalize(() => {
                    this.authService.clearSession();
                    void this.router.navigate(['/auth/login']);
                })
            )
            .subscribe({
                next: () => { },
                error: () => { }
            });
    }

}
