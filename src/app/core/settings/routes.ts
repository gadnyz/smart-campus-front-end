import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { SettingsShell } from './pages/settings-shell/settings-shell';
import { appSettingsChildRoutes, appSettingsTabs } from '@/app/core/modules/app-feature.registry';
import { PermissionService } from '@/app/core/permissions/permission.service';

/**
 * Le premier onglet que l'utilisateur peut voir, dans l'ordre des onglets : Système, puis
 * Identité, puis les modules.
 */
function firstSettingsTab() {
    const permissions = inject(PermissionService);
    const tab = [...appSettingsTabs]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .find((item) => permissions.canAccess({ permissions: item.permissions, mode: item.mode }));
    return tab ? inject(Router).createUrlTree(tab.routerLink) : 'identity';
}

/**
 * Paramètres shell only. Each module (and CORE) contributes children via settingsRoute.
 */
export default [
    {
        path: '',
        component: SettingsShell,
        children: [...appSettingsChildRoutes, { path: '', pathMatch: 'full', redirectTo: firstSettingsTab }]
    }
] as Routes;
