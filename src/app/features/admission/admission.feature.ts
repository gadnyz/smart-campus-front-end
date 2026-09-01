import { AppFeature } from '@/app/core/modules/app-feature.model';
import { AdmissionPermission } from './permissions/permission.model';
import { admissionDashboardWidgets } from './dashboard/dashboard.widgets';

export const admissionFeature: AppFeature = {
    key: 'admission',
    label: 'Admission',
    order: 20,
    route: {
        path: 'admission',
        loadChildren: () => import('./routes')
    },
    menu: [
        {
            label: 'Admission',
            order: 20,
            items: [
                {
                    label: 'Candidatures',
                    icon: 'pi pi-fw pi-id-card',
                    routerLink: ['/admission/candidates'],
                    permissions: [AdmissionPermission.AdmissionCandidateReadAll],
                    order: 10
                }
            ]
        }
    ],
    settingsTab: {
        key: 'admission',
        label: 'Admission',
        order: 30,
        routerLink: ['/settings/admission'],
        permissions: [AdmissionPermission.AdmissionCandidateUpdateAll],
        mode: 'any',
        items: [
            {
                label: 'Activation',
                icon: 'pi pi-power-off',
                routerLink: ['/settings/admission'],
                permissions: [AdmissionPermission.AdmissionCandidateUpdateAll],
                order: 10
            }
        ]
    },
    settingsRoute: {
        path: 'admission',
        loadChildren: () => import('./settings/routes')
    },
    dashboardWidgets: admissionDashboardWidgets
};
