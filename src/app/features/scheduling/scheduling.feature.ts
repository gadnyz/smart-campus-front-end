import { AppFeature } from '@/app/core/modules/app-feature.model';
import { SchedulingPermission } from './permissions/permission.model';

/**
 * Module Planification. La gestion des salles est une donnée de référence : elle vit
 * dans l'onglet Paramètres › Planification (sur le modèle de Paramètres › Academic ›
 * Niveaux), pas dans le menu opérationnel.
 *
 * Les Emplois du temps et les Séances, qui sont des données d'exploitation, viendront
 * dans une prochaine étape et rétabliront un `route` + `menu` opérationnels
 * (voir permissions/permission.model.ts).
 */
export const schedulingFeature: AppFeature = {
    key: 'scheduling',
    label: 'Planification',
    order: 18,
    settingsTab: {
        key: 'scheduling',
        label: 'Planification',
        order: 28,
        routerLink: ['/settings/scheduling/rooms'],
        permissions: [SchedulingPermission.RoomUpdateAll],
        mode: 'any',
        items: [
            {
                label: 'Salles',
                icon: 'pi pi-map-marker',
                routerLink: ['/settings/scheduling/rooms'],
                permissions: [SchedulingPermission.RoomUpdateAll],
                order: 10
            }
        ]
    },
    settingsRoute: {
        path: 'scheduling',
        loadChildren: () => import('./settings/routes')
    }
};
