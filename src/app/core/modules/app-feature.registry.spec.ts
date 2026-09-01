import {
    appDashboardWidgets,
    appFeatureRoutes,
    appFeatures,
    appMenuItems,
    appSettingsChildRoutes,
    appSettingsTabs
} from './app-feature.registry';

describe('app-feature.registry (dynamic module registry)', () => {
    it('should register core, identity and admission features sorted by order', () => {
        expect(appFeatures.map((feature) => feature.key)).toEqual(['system', 'identity', 'admission']);

        for (let index = 1; index < appFeatures.length; index++) {
            expect(appFeatures[index].order ?? 0).toBeGreaterThanOrEqual(appFeatures[index - 1].order ?? 0);
        }
    });

    it('should expose feature routes and a settings shell route', () => {
        const paths = appFeatureRoutes.map((route) => route.path);

        expect(paths).toContain('identity');
        expect(paths).toContain('admission');
        expect(paths).toContain('settings');
    });

    it('should aggregate settings tabs with identity users entry', () => {
        const identityTab = appSettingsTabs.find((tab) => tab.key === 'identity');

        expect(identityTab).toBeTruthy();
        expect(identityTab?.routerLink).toEqual(['/settings/identity/users']);
        expect(identityTab?.items?.some((item) => item.label === 'Utilisateurs')).toBeTrue();
    });

    it('should expose identity settings child route under settings', () => {
        expect(appSettingsChildRoutes.some((route) => route.path === 'identity')).toBeTrue();
    });

    it('should expose dashboard widgets gated by identity permissions', () => {
        expect(appDashboardWidgets.length).toBeGreaterThan(0);
        expect(appDashboardWidgets.every((widget) => Array.isArray(widget.permissions))).toBeTrue();
    });

    it('should keep operational menu items as a sorted list', () => {
        expect(Array.isArray(appMenuItems)).toBeTrue();

        for (let index = 1; index < appMenuItems.length; index++) {
            expect(appMenuItems[index].order ?? 0).toBeGreaterThanOrEqual(appMenuItems[index - 1].order ?? 0);
        }
    });
});
