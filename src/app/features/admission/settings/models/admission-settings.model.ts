/** Admission module settings. Persisted locally until API is available. */
export interface AdmissionSettings {
    publicApplyEnabled: boolean;
    enrollmentOpensAt: string | null;
    enrollmentClosesAt: string | null;
    applyWelcomeMessage: string;
    /** null = unlimited */
    maxActiveApplicationsPerEmail: number | null;
}

export const DEFAULT_ADMISSION_SETTINGS: AdmissionSettings = {
    publicApplyEnabled: true,
    enrollmentOpensAt: null,
    enrollmentClosesAt: null,
    applyWelcomeMessage:
        'Bienvenue sur le portail de préinscription. Remplissez le formulaire et joignez les documents requis.',
    maxActiveApplicationsPerEmail: 1
};
