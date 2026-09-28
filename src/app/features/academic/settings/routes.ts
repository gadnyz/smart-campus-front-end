import { Routes } from '@angular/router';
import { permissionGuard } from '@/app/core/permissions/permission.guard';
import { AcademicPermission } from '../permissions/permission.model';
import { AcademicYearsPage } from './pages/academic-years/academic-years';
import { SemestersPage } from './pages/semesters/semesters';
import { LevelsPage } from './pages/levels/levels';
import { ProfessorGradesPage } from './pages/professor-grades/professor-grades';

export default [
    {
        path: 'years',
        component: AcademicYearsPage,
        canActivate: [permissionGuard],
        data: {
            permissions: [AcademicPermission.AcademicYearUpdateAll],
            mode: 'any'
        }
    },
    {
        path: 'semesters',
        component: SemestersPage,
        canActivate: [permissionGuard],
        data: {
            permissions: [AcademicPermission.SemesterUpdateAll],
            mode: 'any'
        }
    },
    {
        path: 'levels',
        component: LevelsPage,
        canActivate: [permissionGuard],
        data: {
            permissions: [AcademicPermission.LevelUpdateAll],
            mode: 'any'
        }
    },
    {
        path: 'professor-grades',
        component: ProfessorGradesPage,
        canActivate: [permissionGuard],
        data: {
            permissions: [AcademicPermission.ProfessorGradeUpdateAll],
            mode: 'any'
        }
    },
    { path: '', redirectTo: 'years', pathMatch: 'full' }
] as Routes;