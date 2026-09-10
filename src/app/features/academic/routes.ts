import { Routes } from '@angular/router';
import { permissionGuard } from '@/app/core/permissions/permission.guard';
import { AcademicPermission } from './permissions/permission.model';
import { AcademicPlaceholder } from './pages/academic-placeholder/academic-placeholder';
import { AcademicHomeRedirect } from './pages/academic-home-redirect/academic-home-redirect';
import { FacultyListPage } from './pages/faculty-list/faculty-list';
import { FacultyDetailPage } from './pages/faculty-detail/faculty-detail';
import { CourseListPage } from './pages/course-list/course-list';
import { CourseDetailPage } from './pages/course-detail/course-detail';


export default [
    {
        path: 'my-faculty',
        component: FacultyDetailPage,
        canActivate: [permissionGuard],
        data: {
            permissions: [AcademicPermission.FacultyReadOwn],
            ownFaculty: true
        }
    },
    {
        path: 'faculties',
        component: FacultyListPage,
        canActivate: [permissionGuard],
        data: {
            permissions: [AcademicPermission.FacultyReadAll]
        }
    },
    {
        path: 'faculties/:id',
        component: FacultyDetailPage,
        canActivate: [permissionGuard],
        data: {
            permissions: [AcademicPermission.FacultyReadAll, AcademicPermission.FacultyReadOwn],
            mode: 'any'
        }
    },
    {
        path: 'courses',
        component: CourseListPage,
        canActivate: [permissionGuard],
        data: {
            permissions: [AcademicPermission.CourseReadAll, AcademicPermission.CourseReadOwn],
            mode: 'any'
        }
    },
    {
        path: 'courses/:id',
        component: CourseDetailPage,
        canActivate: [permissionGuard],
        data: {
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
    { path: '', component: AcademicHomeRedirect }
] as Routes;