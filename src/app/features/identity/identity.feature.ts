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
    menu: [
        {
            label: 'Identité',
            order: 10,
            items: [
                {
                    label: 'Utilisateurs',
                    icon: 'pi pi-fw pi-users',
                    routerLink: ['/identity/users'],
                    permissions: [IdentityPermission.UserReadAll],
                    order: 10
                },
                {
                    label: 'Profils métier',
                    icon: 'pi pi-fw pi-id-card',
                    routerLink: ['/identity/business-profiles'],
                    permissions: [IdentityPermission.ProfileReadAll],
                    order: 20
                },
                {
                    label: 'Rôles',
                    icon: 'pi pi-fw pi-shield',
                    routerLink: ['/identity/roles'],
                    permissions: [IdentityPermission.RoleReadAll],
                    order: 30
                },
                {
                    label: 'Privilèges',
                    icon: 'pi pi-fw pi-key',
                    routerLink: ['/identity/privileges'],
                    permissions: [IdentityPermission.PrivilegeReadAll],
                    order: 40
                }
            ]
        }
    ],
    dashboardWidgets: identityDashboardWidgets
};
