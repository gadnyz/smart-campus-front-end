import { AppFeature } from '@/app/core/modules/app-feature.model';
import { SchedulingPermission } from './permissions/permission.model';

/**
 * Module Planification. La gestion des salles est une donnée de référence : elle vit
 * dans l'onglet Paramètres › Planification (sur le modèle de Paramètres › Academic ›
 * Niveaux), pas dans le menu opérationnel.
 *
 * Les horaires (emplois du temps hebdomadaires et leurs sessions) sont des données
 * d'exploitation : ils vivent dans le menu opérationnel, sous `/scheduling/timetable`
 * (calendrier, horaires en attente, création et édition — voir timetable/routes.ts).
 */
export const schedulingFeature: AppFeature = {
    key: 'scheduling',
    label: 'Planification',
    order: 18,
    route: {
        path: 'scheduling',
        loadChildren: () => import('./timetable/routes')
    },
    menu: [
        {
            label: 'Planification',
            order: 18,
            items: [
                {
                    // Gestion : admin Scheduling et SAF (sa faculté).
                    label: 'Horaires',
                    icon: 'pi pi-fw pi-calendar',
                    routerLink: ['/scheduling/timetable'],
                    permissions: [SchedulingPermission.TimetableCreateAll, SchedulingPermission.TimetableUpdateAll],
                    mode: 'any',
                    order: 10
                },
                {
                    // Lecture personnelle : étudiant et professeur. Masqué pour qui gère les horaires.
                    label: 'Mon horaire',
                    icon: 'pi pi-fw pi-calendar-clock',
                    routerLink: ['/scheduling/my-timetable'],
                    permissions: [SchedulingPermission.TimetableEntryReadOwn],
                    hiddenWhenPermissions: [SchedulingPermission.TimetableCreateAll, SchedulingPermission.TimetableUpdateAll],
                    hiddenWhenMode: 'any',
                    order: 20
                }
            ]
        }
    ],
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
