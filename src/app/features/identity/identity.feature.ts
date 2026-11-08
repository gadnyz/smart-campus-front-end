import { AppFeature } from '@/app/core/modules/app-feature.model';
import { IdentityPermission } from './permissions/permission.model';
import { identityDashboardWidgets } from './dashboard/dashboard.widgets';

export const identityFeature: AppFeature = {
    key: 'identity',
    label: 'Identité',
    order: 10,
    route: {
        path: 'identity',
        loadChildren: () => import('./routes')
    },
    /** No operational sidebar entries — admin lives under Paramètres. */
    menu: [],
    settingsTab: {
        key: 'identity',
        label: 'Identité',
        order: 20,
        routerLink: ['/settings/identity/users'],
        permissions: [
            IdentityPermission.UserReadAll,
            IdentityPermission.UserUpdateAll,
            IdentityPermission.ProfileReadAll,
            IdentityPermission.ProfileUpdateAll,
            IdentityPermission.RoleReadAll,
            IdentityPermission.RoleUpdateAll,
            IdentityPermission.PrivilegeReadAll,
            IdentityPermission.PrivilegeCreateAll,
            IdentityPermission.PrivilegeDeleteAll
        ],
        mode: 'any',
        items: [
            {
                label: 'Utilisateurs',
                icon: 'pi pi-users',
                routerLink: ['/settings/identity/users'],
                permissions: [IdentityPermission.UserReadAll, IdentityPermission.UserUpdateAll],
                mode: 'any',
                order: 10
            },
            {
                label: 'Profils métier',
                icon: 'pi pi-id-card',
                routerLink: ['/settings/identity/business-profiles'],
                permissions: [IdentityPermission.ProfileReadAll, IdentityPermission.ProfileUpdateAll],
                mode: 'any',
                order: 20
            },
            {
                label: 'Rôles',
                icon: 'pi pi-shield',
                routerLink: ['/settings/identity/roles'],
                permissions: [IdentityPermission.RoleReadAll, IdentityPermission.RoleUpdateAll],
                mode: 'any',
                order: 30
            },
            {
                label: 'Privilèges',
                icon: 'pi pi-key',
                routerLink: ['/settings/identity/privileges'],
                permissions: [IdentityPermission.PrivilegeReadAll, IdentityPermission.PrivilegeCreateAll, IdentityPermission.PrivilegeDeleteAll],
                mode: 'any',
                order: 40
            }
        ]
    },
    settingsRoute: {
        path: 'identity',
        loadChildren: () => import('./routes.admin').then((m) => m.identityAdminRoutes)
    },
    dashboardWidgets: identityDashboardWidgets
};
