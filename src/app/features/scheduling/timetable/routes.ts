import { Routes } from '@angular/router';
import { permissionGuard } from '@/app/core/permissions/permission.guard';
import { SchedulingPermission } from '../permissions/permission.model';
import { timetableFormLeaveGuard } from './pages/timetable-form/timetable-form-leave.guard';
import { CREATE_TIMETABLES, EDIT_TIMETABLES, MANAGE_TIMETABLES } from './utils/timetable-routes';

export default [
    {
        path: 'timetable',
        loadComponent: () => import('./pages/timetable/timetable').then((m) => m.TimetablePage),
        canActivate: [permissionGuard],
        data: {
            permissions: MANAGE_TIMETABLES,
            mode: 'any'
        }
    },
    {
        path: 'timetable/pending',
        loadComponent: () => import('./pages/timetable-pending/timetable-pending').then((m) => m.TimetablePendingPage),
        canActivate: [permissionGuard],
        data: {
            permissions: MANAGE_TIMETABLES,
            mode: 'any'
        }
    },
    {
        path: 'timetable/new',
        loadComponent: () => import('./pages/timetable-form/timetable-form').then((m) => m.TimetableFormPage),
        canActivate: [permissionGuard],
        canDeactivate: [timetableFormLeaveGuard],
        data: {
            permissions: CREATE_TIMETABLES
        }
    },
    {
        path: 'timetable/:id/edit',
        loadComponent: () => import('./pages/timetable-form/timetable-form').then((m) => m.TimetableFormPage),
        canActivate: [permissionGuard],
        canDeactivate: [timetableFormLeaveGuard],
        data: {
            permissions: EDIT_TIMETABLES,
            mode: 'any'
        }
    },
    {
        // Emploi du temps personnel : étudiant (sa promotion) ou professeur (ses séances).
        path: 'my-timetable',
        loadComponent: () => import('./pages/my-timetable/my-timetable').then((m) => m.MyTimetablePage),
        canActivate: [permissionGuard],
        data: {
            permissions: [SchedulingPermission.TimetableEntryReadOwn]
        }
    },
    { path: '', redirectTo: 'timetable', pathMatch: 'full' }
] as Routes;
