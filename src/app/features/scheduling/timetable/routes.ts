import { Routes } from '@angular/router';
import { permissionGuard } from '@/app/core/permissions/permission.guard';
import { SchedulingPermission } from '../permissions/permission.model';
import { timetableFormLeaveGuard } from './pages/timetable-form/timetable-form-leave.guard';

/**
 * Gestion des horaires (admin Scheduling, SAF) : calendrier, liste, création, édition. La lecture
 * seule (`timetable:read:all`) ne suffit pas : étudiants et professeurs la détiennent aussi.
 */
const MANAGE_TIMETABLES = [SchedulingPermission.TimetableCreateAll, SchedulingPermission.TimetableUpdateAll];

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
