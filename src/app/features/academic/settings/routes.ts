import { Routes } from '@angular/router';
import { permissionGuard } from '@/app/core/permissions/permission.guard';
import { AcademicPermission } from '../permissions/permission.model';
import { AcademicPlaceholder } from '../pages/academic-placeholder/academic-placeholder';
import { AcademicYearsPage } from './pages/academic-years/academic-years';
import { SemestersPage } from './pages/semesters/semesters';
import { LevelsPage } from './pages/levels/levels';

export default [
    {
        path: 'years',
        component: AcademicYearsPage,
        canActivate: [permissionGuard],
        data: {
            permissions: [AcademicPermission.AcademicYearReadAll],
            mode: 'any'
        }
    },
    {
        path: 'semesters',
        component: SemestersPage,
        canActivate: [permissionGuard],
        data: {
            permissions: [AcademicPermission.SemesterReadAll],
            mode: 'any'
        }
    },
    {
        path: 'levels',
        component: LevelsPage,
        canActivate: [permissionGuard],
        data: {
            permissions: [AcademicPermission.LevelReadAll],
            mode: 'any'
        }
    },
    {
        path: 'professor-grades',
        component: AcademicPlaceholder,
        canActivate: [permissionGuard],
        data: {
            permissions: [AcademicPermission.ProfessorGradeReadAll],
            mode: 'any'
        }
    },
    { path: '', redirectTo: 'years', pathMatch: 'full' }
] as Routes;