import { Routes } from '@angular/router';
import { permissionGuard } from '@/app/core/permissions/permission.guard';
import { SchedulingPermission } from '../permissions/permission.model';
import { timetableFormLeaveGuard } from './pages/timetable-form/timetable-form-leave.guard';

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
    {
        path: 'timetable/pending',
        loadComponent: () => import('./pages/timetable-pending/timetable-pending').then((m) => m.TimetablePendingPage),
        canActivate: [permissionGuard],
        data: {
            permissions: [SchedulingPermission.TimetableReadAll]
        }
    },
    {
        path: 'timetable/new',
        loadComponent: () => import('./pages/timetable-form/timetable-form').then((m) => m.TimetableFormPage),
        canActivate: [permissionGuard],
        canDeactivate: [timetableFormLeaveGuard],
        data: {
            permissions: [SchedulingPermission.TimetableCreateAll]
        }
    },
    {
        path: 'timetable/:id/edit',
        loadComponent: () => import('./pages/timetable-form/timetable-form').then((m) => m.TimetableFormPage),
        canActivate: [permissionGuard],
        canDeactivate: [timetableFormLeaveGuard],
        data: {
            permissions: [SchedulingPermission.TimetableUpdateAll, SchedulingPermission.TimetableEntryUpdateAll],
            mode: 'any'
        }
    },
    { path: '', redirectTo: 'timetable', pathMatch: 'full' }
] as Routes;
