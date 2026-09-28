import { AppFeature } from '@/app/core/modules/app-feature.model';
import { AcademicPermission } from './permissions/permission.model';
import { academicDashboardWidgets } from './dashboard/dashboard.widgets';



export const academicFeature: AppFeature = {
    key: 'Academique',
    label: 'Academique',
    order: 15,
    route: {
        path: 'academic',
        loadChildren: () => import('./routes')
    },
    menu: [
        {
            label: 'Academique',
            order: 15,
            items: [
                {
                    label: 'Ma faculté',
                    icon: 'pi pi-fw pi-building',
                    routerLink: ['/academic/my-faculty'],
                    permissions: [AcademicPermission.FacultyReadOwn],
                    hiddenWhenPermissions: [AcademicPermission.FacultyUpdateAll],
                    order: 5
                },
                {
                    label: 'Facultés',
                    icon: 'pi pi-fw pi-building',
                    routerLink: ['/academic/faculties'],
                    permissions: [AcademicPermission.FacultyUpdateAll],
                    order: 10
                },
                {
                    label: 'Unités d’enseignement',
                    icon: 'pi pi-fw pi-th-large',
                    routerLink: ['/academic/course-units'],
                    permissions: [AcademicPermission.CourseUnitUpdateAll, AcademicPermission.FacultyReadOwn],
                    mode: 'any',
                    order: 15
                },
                {
                    label: 'Cours',
                    icon: 'pi pi-fw pi-book',
                    routerLink: ['/academic/courses'],
                    permissions: [AcademicPermission.CourseUpdateAll, AcademicPermission.CourseReadOwn],
                    mode: 'any',
                    order: 20
                },
                {
                    label: 'Mes cours',
                    icon: 'pi pi-fw pi-bookmark',
                    routerLink: ['/academic/my-courses'],
                    permissions: [AcademicPermission.CourseReadOwn, AcademicPermission.ProfessorReadOwn],
                    mode: 'any',
                    hiddenWhenPermissions: [AcademicPermission.CourseUpdateAll],
                    order: 25
                },
                {
                    label: 'Professeurs',
                    icon: 'pi pi-fw pi-users',
                    routerLink: ['/academic/professors'],
                    permissions: [AcademicPermission.ProfessorUpdateAll],
                    order: 30
                },
                {
                    label: 'Étudiants',
                    icon: 'pi pi-fw pi-id-card',
                    routerLink: ['/academic/students'],
                    permissions: [AcademicPermission.StudentUpdateAll],
                    order: 40
                }
            ]
        }
    ],
    settingsTab: {
        key: 'academic',
        label: 'Academic',
        order: 25,
        routerLink: ['/settings/academic/years'],
        permissions: [
            AcademicPermission.AcademicYearUpdateAll,
            AcademicPermission.SemesterUpdateAll,
            AcademicPermission.LevelUpdateAll,
            AcademicPermission.ProfessorGradeUpdateAll
        ],
        mode: 'any',
        items: [
            {
                label: 'Années académiques',
                icon: 'pi pi-calendar',
                routerLink: ['/settings/academic/years'],
                permissions: [AcademicPermission.AcademicYearUpdateAll],
                order: 10
            },
            {
                label: 'Semestres',
                icon: 'pi pi-clock',
                routerLink: ['/settings/academic/semesters'],
                permissions: [AcademicPermission.SemesterUpdateAll],
                order: 20
            },
            {
                label: 'Niveaux',
                icon: 'pi pi-sort-alt',
                routerLink: ['/settings/academic/levels'],
                permissions: [AcademicPermission.LevelUpdateAll],
                order: 30
            },
            {
                label: 'Grades professeurs',
                icon: 'pi pi-star',
                routerLink: ['/settings/academic/professor-grades'],
                permissions: [AcademicPermission.ProfessorGradeUpdateAll],
                order: 40
            }
        ]
    },
    settingsRoute: {
        path: 'academic',
        loadChildren: () => import('./settings/routes')
    },
    dashboardWidgets: academicDashboardWidgets
};