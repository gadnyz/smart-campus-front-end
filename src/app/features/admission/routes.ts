import { Routes } from '@angular/router';
import { permissionGuard } from '@/app/core/permissions/permission.guard';
import { AdmissionPermission } from './permissions/permission.model';
import { CandidateManagement } from './pages/candidate-management/candidate-management';
import { CandidateDetail } from './pages/candidate-detail/candidate-detail';

export default [
    {
        path: 'candidates',
        component: CandidateManagement,
        canActivate: [permissionGuard],
        data: {
            permissions: [AdmissionPermission.AdmissionCandidateReadAll],
            mode: 'any'
        }
    },

    {
        path: 'my-application',
        loadComponent: () =>
            import('./pages/candidate-portal/candidate-portal').then((m) => m.CandidatePortal),
        canActivate: [permissionGuard],
        data: {
            permissions: [
                AdmissionPermission.AdmissionCandidateReadOwn,
                AdmissionPermission.AdmissionCandidateUpdateOwn
            ],
            mode: 'any'
        }
    },
    {
        path: 'candidates/:id',
        component: CandidateDetail,
        canActivate: [permissionGuard],
        data: {
            permissions: [AdmissionPermission.AdmissionCandidateReadAll],
            mode: 'any'
        }
    },
    { path: '', redirectTo: 'candidates', pathMatch: 'full' }
] as Routes;