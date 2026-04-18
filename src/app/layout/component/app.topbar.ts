import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LayoutService } from '@/app/layout/service/layout.service';
import { appBrand } from '@/app/core/config/app-brand';

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [RouterModule, CommonModule],
    template: `
        <header class="layout-topbar">
            <div class="layout-topbar-left">
                <button type="button" class="layout-menu-button layout-topbar-action" (click)="layoutService.onMenuToggle()">
                    <i class="pi pi-bars"></i>
                </button>

                <a class="layout-topbar-logo" routerLink="/">
                    <img [src]="brand.logos.main" [alt]="brand.appName" />
                    <span>{{ brand.appName }}</span>
                </a>
            </div>

            <div class="layout-topbar-right">
                <button type="button" class="layout-topbar-action" aria-label="Notifications">
                    <i class="pi pi-bell"></i>
                </button>

                <button type="button" class="layout-topbar-action" (click)="toggleDarkMode()" aria-label="Thème">
                    <i [ngClass]="{ pi: true, 'pi-moon': !layoutService.isDarkTheme(), 'pi-sun': layoutService.isDarkTheme() }"></i>
                </button>

                <button type="button" class="layout-topbar-user" aria-label="Profil utilisateur">
                    <i class="pi pi-user"></i>
                    <span>Mon profil</span>
                </button>
            </div>
        </header>
    `
})
export class AppTopbar {
    readonly brand = appBrand;
    readonly layoutService = inject(LayoutService);

    toggleDarkMode() {
        this.layoutService.layoutConfig.update((state) => ({
            ...state,
            darkTheme: !state.darkTheme
        }));
    }
}
