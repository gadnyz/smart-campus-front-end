import { AppFeature } from '@/app/core/modules/app-feature.model';
import { SchedulingPermission } from './permissions/permission.model';

/**
 * Module Scheduling — emplois du temps. Seule la gestion des Salles est branchée
 * pour l'instant ; Emplois du temps et Séances suivront dans une prochaine étape
 * (voir routes.ts et permissions/permission.model.ts).
 */
export const schedulingFeature: AppFeature = {
    key: 'scheduling',
    label: 'Emplois du temps',
    order: 18,
    route: {
        path: 'scheduling',
        loadChildren: () => import('./routes')
    },
    menu: [
        {
            label: 'Emplois du temps',
            order: 18,
            items: [
                {
                    label: 'Salles',
                    icon: 'pi pi-fw pi-map-marker',
                    routerLink: ['/scheduling/rooms'],
                    permissions: [SchedulingPermission.RoomReadAll],
                    order: 10
                }
            ]
        }
    ]
};
