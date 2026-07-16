import { DashboardWidget } from '@/app/core/modules/app-feature.model';
import { AdmissionPermission } from '../permissions/permission.model';
import { CandidateStatsWidget } from './components/candidate-stats-widget';
import { CandidateStatusStatsWidget } from './components/candidate-status-stats-widget';

export const admissionDashboardWidgets: DashboardWidget[] = [
    {
        key: 'admission-candidate-stats',
        title: 'Candidatures',
        module: 'admission',
        component: CandidateStatsWidget,
        permissions: [AdmissionPermission.AdmissionCandidateReadAll],
        mode: 'any',
        size: 'sm',
        order: 30
    },
    {
        key: 'admission-candidate-status-stats',
        title: 'Candidatures par statut',
        module: 'admission',
        component: CandidateStatusStatsWidget,
        permissions: [AdmissionPermission.AdmissionCandidateReadAll],
        mode: 'any',
        size: 'full',
        order: 40
    }
];
