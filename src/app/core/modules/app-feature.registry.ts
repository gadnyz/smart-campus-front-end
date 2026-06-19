import { Route } from '@angular/router';
import { identityFeature } from '@/app/features/identity/identity.feature';
import { AppFeature, DashboardWidget, FeatureMenuItem } from './app-feature.model';

const byOrder = <T extends { order?: number }>(a: T, b: T) => (a.order ?? 0) - (b.order ?? 0);

export const appFeatures: AppFeature[] = [identityFeature].sort(byOrder);

export const appFeatureRoutes: Route[] = appFeatures.flatMap((feature) => (feature.route ? [feature.route] : []));

export const appMenuItems: FeatureMenuItem[] = appFeatures.flatMap((feature) => feature.menu ?? []).sort(byOrder);

export const appDashboardWidgets: DashboardWidget[] = appFeatures
    .flatMap((feature) => feature.dashboardWidgets ?? [])
    .sort(byOrder);