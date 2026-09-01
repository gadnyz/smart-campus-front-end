import { Routes } from '@angular/router';
import { permissionGuard } from '@/app/core/permissions/permission.guard';
import { AdmissionPermission } from '../permissions/permission.model';
import { AdmissionSettingsPage } from './pages/admission-settings/admission-settings';

/** Admission config — mounted under /settings/admission by the CORE shell. */
export default [
    {
        path: '',
        component: AdmissionSettingsPage,
        canActivate: [permissionGuard],
        data: {
            permissions: [AdmissionPermission.AdmissionCandidateUpdateAll],
            mode: 'any'
        }
    }
] as Routes;
