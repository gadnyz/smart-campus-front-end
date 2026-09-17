import { DashboardWidget } from '@/app/core/modules/app-feature.model';
import { AcademicPermission } from '../permissions/permission.model';
import { FacultyStatsWidget } from './components/faculty-stats-widget';
import { ProfessorStatsWidget } from './components/professor-stats-widget';

export const academicDashboardWidgets: DashboardWidget[] = [
    {
        key: 'academic-faculty-stats',
        title: 'Facultés',
        module: 'academic',
        component: FacultyStatsWidget,
        permissions: [AcademicPermission.FacultyReadAll],
        mode: 'any',
        size: 'sm',
        order: 15
    },
    {
        key: 'academic-professor-stats',
        title: 'Professeurs',
        module: 'academic',
        component: ProfessorStatsWidget,
        permissions: [AcademicPermission.ProfessorReadAll],
        mode: 'any',
        size: 'sm',
        order: 16
    }
];
