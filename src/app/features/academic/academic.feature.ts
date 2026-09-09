import { AppFeature } from '@/app/core/modules/app-feature.model';
import { AcademicPermission } from './permissions/permission.model';

export const academicFeature: AppFeature = {
    key: 'academic',
    label: 'Academic',
    order: 15,
    route: {
        path: 'academic',
        loadChildren: () => import('./routes')
    },
    menu: [
        {
            label: 'Academic',
            order: 15,
            items: [
                {
                    label: 'Facultés',
                    icon: 'pi pi-fw pi-building',
                    routerLink: ['/academic/faculties'],
                    permissions: [AcademicPermission.FacultyReadAll, AcademicPermission.FacultyReadOwn],
                    mode: 'any',
                    order: 10
                },
                {
                    label: 'Cours',
                    icon: 'pi pi-fw pi-book',
                    routerLink: ['/academic/courses'],
                    permissions: [AcademicPermission.CourseReadAll, AcademicPermission.CourseReadOwn],
                    mode: 'any',
                    order: 20
                },
                {
                    label: 'Professeurs',
                    icon: 'pi pi-fw pi-users',
                    routerLink: ['/academic/professors'],
                    permissions: [AcademicPermission.ProfessorReadAll],
                    order: 30
                },
                {
                    label: 'Étudiants',
                    icon: 'pi pi-fw pi-id-card',
                    routerLink: ['/academic/students'],
                    permissions: [AcademicPermission.StudentReadAll],
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
            AcademicPermission.AcademicYearReadAll,
            AcademicPermission.SemesterReadAll,
            AcademicPermission.LevelReadAll,
            AcademicPermission.ProfessorGradeReadAll
        ],
        mode: 'any',
        items: [
            {
                label: 'Années académiques',
                icon: 'pi pi-calendar',
                routerLink: ['/settings/academic/years'],
                permissions: [AcademicPermission.AcademicYearReadAll],
                order: 10
            },
            {
                label: 'Semestres',
                icon: 'pi pi-clock',
                routerLink: ['/settings/academic/semesters'],
                permissions: [AcademicPermission.SemesterReadAll],
                order: 20
            },
            {
                label: 'Niveaux',
                icon: 'pi pi-sort-alt',
                routerLink: ['/settings/academic/levels'],
                permissions: [AcademicPermission.LevelReadAll],
                order: 30
            },
            {
                label: 'Grades professeurs',
                icon: 'pi pi-star',
                routerLink: ['/settings/academic/professor-grades'],
                permissions: [AcademicPermission.ProfessorGradeReadAll],
                order: 40
            }
        ]
    },
    settingsRoute: {
        path: 'academic',
        loadChildren: () => import('./settings/routes')
    }
};