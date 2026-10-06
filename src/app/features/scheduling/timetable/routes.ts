import { Routes } from '@angular/router';
import { permissionGuard } from '@/app/core/permissions/permission.guard';
import { SchedulingPermission } from '../permissions/permission.model';

export default [
    {
        path: 'timetable',
        loadComponent: () => import('./pages/timetable/timetable').then((m) => m.TimetablePage),
        canActivate: [permissionGuard],
        data: {
            permissions: [SchedulingPermission.TimetableReadAll, SchedulingPermission.TimetableEntryReadAll],
            mode: 'any'
        }
    },
    { path: '', redirectTo: 'timetable', pathMatch: 'full' }
] as Routes;