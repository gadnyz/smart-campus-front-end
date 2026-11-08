import { manageAuthorities } from '@/app/core/permissions/permission-scope';

export const AdmissionPermission = {
    AdmissionCandidateUpdateOwn : "admission:candidate:update:own",
    AdmissionCandidateReadAll : "admission:candidate:read:all",
    AdmissionCandidateReadFaculty : "admission:candidate:read:faculty",
    AdmissionCandidateReadOwn : "admission:candidate:read:own",
    AdmissionCandidateUpdateAll : "admission:candidate:update:all",
    AdmissionCandidateUpdateFaculty : "admission:candidate:update:faculty",
    AdmissionCandidateDeleteAll : "admission:candidate:delete:all",
    AdmissionCandidateCreateAll : "admission:candidate:create:all"
} as const;

export type AdmissionPermission =
    (typeof AdmissionPermission)[keyof typeof AdmissionPermission];
export const AdmissionResource = {
    Candidate: 'admission:candidate'
} as const;

/** Gestion des candidatures : une écriture au-delà de son propre dossier, ou la lecture de tout. */
export const AdmissionManage = {
    Candidate: manageAuthorities(AdmissionResource.Candidate)
} as const;
