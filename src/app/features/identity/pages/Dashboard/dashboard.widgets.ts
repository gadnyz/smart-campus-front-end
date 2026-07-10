import { DashboardWidget } from '@/app/pages/dashboard/models/widget.model';
import { IdentityPermission } from '@/app/features/identity/permissions/permission.model';
import { StatsWidget } from '@/app/features/identity/pages/Dashboard/components/statswidget';
import { RepartitionUsers } from '@/app/features/identity/pages/Dashboard/components/repartition_users';

export const identityDashboardWidgets: DashboardWidget[] = [
    {
        key: 'identity-users-stats',
        title: 'Statistiques utilisateurs',
        module: 'identity',
        component: StatsWidget,
        permissions: [IdentityPermission.UserRead, IdentityPermission.UserManage],
        mode: 'any',
        size: 'sm',
        order: 10
    },
    {
        key: 'identity-users-repartition',
        title: 'Utilisateurs par profil',
        module: 'identity',
        component: RepartitionUsers,
        permissions: [IdentityPermission.UserRead, IdentityPermission.UserManage],
        mode: 'any',
        size: 'full',
        order: 20
    }
];