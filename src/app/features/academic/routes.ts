import { Routes } from '@angular/router';
import { permissionGuard } from '@/app/core/permissions/permission.guard';
import { AcademicPermission } from './permissions/permission.model';
import { AcademicPlaceholder } from './pages/academic-placeholder/academic-placeholder';

export default [
    {
        path: 'faculties',
        component: AcademicPlaceholder,
        canActivate: [permissionGuard],
        data: {
            title: 'Facultés',
            permissions: [AcademicPermission.FacultyReadAll, AcademicPermission.FacultyReadOwn],
            mode: 'any'
        }
    },
    {
        path: 'courses',
        component: AcademicPlaceholder,
        canActivate: [permissionGuard],
        data: {
            title: 'Cours',
            permissions: [AcademicPermission.CourseReadAll, AcademicPermission.CourseReadOwn],
            mode: 'any'
        }
    },
    {
        path: 'professors',
        component: AcademicPlaceholder,
        canActivate: [permissionGuard],
        data: {
            title: 'Professeurs',
            permissions: [AcademicPermission.ProfessorReadAll],
            mode: 'any'
        }
    },
    {
        path: 'students',
        component: AcademicPlaceholder,
        canActivate: [permissionGuard],
        data: {
            title: 'Étudiants',
            permissions: [AcademicPermission.StudentReadAll],
            mode: 'any'
        }
    },
    { path: '', redirectTo: 'faculties', pathMatch: 'full' }
] as Routes;