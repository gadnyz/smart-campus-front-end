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