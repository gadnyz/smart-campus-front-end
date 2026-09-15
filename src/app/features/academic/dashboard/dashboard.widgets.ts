import { DashboardWidget } from '@/app/core/modules/app-feature.model';
import { AcademicPermission } from '../permissions/permission.model';
import { FacultyStatsWidget } from './components/faculty-stats-widget';

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
    }
];