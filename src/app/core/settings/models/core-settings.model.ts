/** Institution-wide settings (CORE). Persisted locally until API is available. */
export interface CoreSettings {
    systemEmail: string;
    supportEmail: string;
    currentAcademicYearId: string | null;
}

export const DEFAULT_CORE_SETTINGS: CoreSettings = {
    systemEmail: 'noreply@smart-campus.org',
    supportEmail: 'support@smart-campus.org',
    currentAcademicYearId: null
};
