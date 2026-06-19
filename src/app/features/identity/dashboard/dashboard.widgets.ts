import { DashboardWidget } from '@/app/core/modules/app-feature.model';
import { IdentityPermission } from '@/app/features/identity/permissions/permission.model';
import { StatsWidget } from './components/statswidget';
import { RepartitionUsers } from './components/repartition_users';

export const identityDashboardWidgets: DashboardWidget[] = [
    {
        key: 'identity-users-stats',
        title: 'Statistiques utilisateurs',
        module: 'identity',
        component: StatsWidget,
        permissions: [IdentityPermission.UserReadAll],
        mode: 'any',
        size: 'sm',
        order: 10
    },
    {
        key: 'identity-users-repartition',
        title: 'Utilisateurs par profil',
        module: 'identity',
        component: RepartitionUsers,
        permissions: [IdentityPermission.UserReadAll],
        mode: 'any',
        size: 'full',
        order: 20
    }
];