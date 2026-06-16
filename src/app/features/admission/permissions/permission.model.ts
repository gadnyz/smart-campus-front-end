export const AdmissionPermission = {
    AdmissionCandidateUpdateOwn : "admission:candidate:update:own",
    AdmissionCandidateReadAll : "admission:candidate:read:all",
    AdmissionCandidateReadOwn : "admission:candidate:read:own",
    AdmissionCandidateUpdateAll : "admission:candidate:update:all",
    AdmissionCandidateDeleteAll : "admission:candidate:delete:all",
    AdmissionCandidateCreateAll : "admission:candidate:create:all"
} as const;

export type AdmissionPermission =
    (typeof AdmissionPermission)[keyof typeof AdmissionPermission];