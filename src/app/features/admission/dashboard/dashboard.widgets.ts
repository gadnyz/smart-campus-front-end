import { DashboardWidget } from '@/app/core/modules/app-feature.model';
import { AcademicPermission } from '@/app/features/academic/permissions/permission.model';
import { AdmissionPermission } from '../permissions/permission.model';
import { AdmissionOwnSessionWidget } from './components/admission-own-session-widget';
import { CandidateStatsWidget } from './components/candidate-stats-widget';
import { CandidateStatusStatsWidget } from './components/candidate-status-stats-widget';

export const admissionDashboardWidgets: DashboardWidget[] = [
    {
        key: 'admission-own-session',
        title: 'Mon dossier',
        module: 'admission',
        component: AdmissionOwnSessionWidget,
        permissions: [
            AdmissionPermission.AdmissionCandidateReadOwn,
            AcademicPermission.StudentReadOwn
        ],
        mode: 'any',
        size: 'md',
        order: 5
    },
    {
        key: 'admission-candidate-stats',
        title: 'Candidatures',
        module: 'admission',
        component: CandidateStatsWidget,
        permissions: [AdmissionPermission.AdmissionCandidateReadAll],
        mode: 'any',
        size: 'sm',
        order: 16
    }
];