import { Route } from '@angular/router';
import { coreSystemFeature } from '@/app/core/settings/core.feature';
import { admissionFeature } from '@/app/features/admission/admission.feature';
import { identityFeature } from '@/app/features/identity/identity.feature';
import { AppFeature, DashboardWidget, FeatureMenuItem, SettingsTab } from './app-feature.model';

const byOrder = <T extends { order?: number }>(a: T, b: T) => (a.order ?? 0) - (b.order ?? 0);

export const appFeatures: AppFeature[] = [coreSystemFeature, identityFeature, admissionFeature].sort(byOrder);

export const appFeatureRoutes: Route[] = [
    ...appFeatures.flatMap((feature) => (feature.route ? [feature.route] : [])),
    {
        path: 'settings',
        loadChildren: () => import('@/app/core/settings/routes')
    }
];

export const appMenuItems: FeatureMenuItem[] = appFeatures.flatMap((feature) => feature.menu ?? []).sort(byOrder);

export const appSettingsTabs: SettingsTab[] = appFeatures
    .map((feature) => feature.settingsTab)
    .filter((tab): tab is SettingsTab => !!tab)
    .sort(byOrder);

/** Children of the Paramètres shell — each module owns its settingsRoute. */
export const appSettingsChildRoutes: Route[] = appFeatures
    .map((feature) => feature.settingsRoute)
    .filter((route): route is Route => !!route);

export const appDashboardWidgets: DashboardWidget[] = appFeatures
    .flatMap((feature) => feature.dashboardWidgets ?? [])
    .sort(byOrder);
