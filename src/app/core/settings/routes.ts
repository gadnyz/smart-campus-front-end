import { Routes } from '@angular/router';
import { SettingsShell } from './pages/settings-shell/settings-shell';
import { appSettingsChildRoutes } from '@/app/core/modules/app-feature.registry';

/**
 * Paramètres shell only. Each module (and CORE) contributes children via settingsRoute.
 */
export default [
    {
        path: '',
        component: SettingsShell,
        children: [
            ...appSettingsChildRoutes,
            { path: '', pathMatch: 'full', redirectTo: 'identity' }
        ]
    }
] as Routes;
