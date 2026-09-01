import { AppFeature } from '@/app/core/modules/app-feature.model';
import { IdentityPermission } from '@/app/features/identity/permissions/permission.model';

/**
 * CORE system configuration (not a feature module).
 * Owned by core/settings — registered like a feature for tabs + settingsRoute only.
 */
export const coreSystemFeature: AppFeature = {
    key: 'system',
    label: 'Système',
    order: 5,
    menu: [],
    settingsTab: {
        key: 'system',
        label: 'Système',
        order: 10,
        routerLink: ['/settings/system'],
        permissions: [IdentityPermission.ApiManage, IdentityPermission.UserUpdateAll],
        mode: 'any'
    },
    settingsRoute: {
        path: 'system',
        loadChildren: () => import('./system.routes')
    }
};
