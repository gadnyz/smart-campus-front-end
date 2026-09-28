import { Routes } from '@angular/router';
import { permissionGuard } from '@/app/core/permissions/permission.guard';
import { SchedulingPermission } from '../permissions/permission.model';

/**
 * Routes de configuration du module, montées sous /settings/scheduling.
 * Chargées via `loadComponent` (et non par import statique comme
 * `academic/settings/routes.ts`, cf. AUDIT_ANGULAR.md §6.9) pour garder la page
 * dans son propre chunk paresseux.
 */
export default [
    {
        path: 'rooms',
        loadComponent: () => import('./pages/rooms/rooms').then((m) => m.RoomsPage),
        canActivate: [permissionGuard],
        data: {
            permissions: [SchedulingPermission.RoomUpdateAll],
            mode: 'any'
        }
    },
    { path: '', redirectTo: 'rooms', pathMatch: 'full' }
] as Routes;
