import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { SettingsTab, SettingsTabItem } from '@/app/core/modules/app-feature.model';
import { appSettingsTabs } from '@/app/core/modules/app-feature.registry';

/** Thin Paramètres shell — tabs come from each module's settingsTab. */
@Component({
    selector: 'app-settings-shell',
    standalone: true,
    imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
    templateUrl: './settings-shell.html',
    styleUrl: './settings-shell.scss'
})
export class SettingsShell implements OnInit {
    private readonly router = inject(Router);
    private readonly permissionService = inject(PermissionService);

    readonly tabs = signal<SettingsTab[]>([]);
    readonly url = signal(this.router.url);

    readonly activeTab = computed(() => {
        const current = this.url();
        return (
            this.tabs().find((tab) => current.startsWith(`/settings/${tab.key}`)) ??
            this.tabs()[0] ??
            null
        );
    });

    readonly secondaryItems = computed(() => {
        const tab = this.activeTab();
        if (!tab?.items?.length) {
            return [] as SettingsTabItem[];
        }

        return tab.items
            .filter((item) =>
                this.permissionService.canAccess({
                    permissions: item.permissions,
                    mode: item.mode
                })
            )
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    });

    ngOnInit(): void {
        const visible = appSettingsTabs
            .filter((tab) =>
                this.permissionService.canAccess({
                    permissions: tab.permissions,
                    mode: tab.mode
                })
            )
            .map((tab) => ({
                ...tab,
                items: tab.items?.filter((item) =>
                    this.permissionService.canAccess({
                        permissions: item.permissions,
                        mode: item.mode
                    })
                )
            }))
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        this.tabs.set(visible);

        this.router.events
            .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
            .subscribe((event) => this.url.set(event.urlAfterRedirects));

        if (this.router.url === '/settings' || this.router.url === '/settings/') {
            const preferred =
                visible.find((tab) => tab.key === 'identity') ??
                visible.find((tab) => tab.key === 'admission') ??
                visible.find((tab) => tab.key === 'system') ??
                visible[0];

            if (preferred) {
                void this.router.navigate(preferred.routerLink);
            }
        }
    }
}
