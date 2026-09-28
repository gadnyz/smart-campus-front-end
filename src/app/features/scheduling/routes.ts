import { Routes } from '@angular/router';
import { permissionGuard } from '@/app/core/permissions/permission.guard';
import { SchedulingPermission } from './permissions/permission.model';

/**
 * Routes opérationnelles du module Scheduling, montées sous /scheduling.
 * Chargées via `loadComponent` (contrairement à `academic/routes.ts`, qui importe
 * ses 12 pages de façon statique — cf. AUDIT_ANGULAR.md §6.9) pour garder chaque
 * page dans son propre chunk paresseux.
 */
export default [
    {
        path: 'rooms',
        loadComponent: () => import('./pages/room-list/room-list').then((m) => m.RoomListPage),
        canActivate: [permissionGuard],
        data: {
            permissions: [SchedulingPermission.RoomReadAll]
        }
    },
    {
        path: 'rooms/:id',
        loadComponent: () => import('./pages/room-detail/room-detail').then((m) => m.RoomDetailPage),
        canActivate: [permissionGuard],
        data: {
            permissions: [SchedulingPermission.RoomReadAll]
        }
    },
    { path: '', redirectTo: 'rooms', pathMatch: 'full' }
] as Routes;
