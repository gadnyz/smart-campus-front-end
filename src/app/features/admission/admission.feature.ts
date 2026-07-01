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
    dashboardWidgets: admissionDashboardWidgets
};