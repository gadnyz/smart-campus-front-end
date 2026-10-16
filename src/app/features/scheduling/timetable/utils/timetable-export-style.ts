/**
 * Couleurs du modèle « Horaire Faculté », partagées par le PDF et le classeur Excel. Le contraste
 * reste lisible imprimé en noir et blanc : le cours est en gras, l'enseignant en italique et la
 * salle précédée de « Salle », sans dépendre de la seule couleur.
 */
export const PRINT_COLORS = {
    header: '#1A5FD0',
    headerText: '#FFFFFF',
    slot: '#1A5FD0',
    course: '#1F4E79',
    professor: '#7B1E1E',
    room: '#C62828',
    pause: '#CFCFCF',
    border: '#D5DCE6',
    muted: '#5B6575'
} as const;

/** `#1A5FD0` → `FF1A5FD0`, le format ARGB d'ExcelJS. */
export function argb(hex: string): string {
    return `FF${hex.replace('#', '').toUpperCase()}`;
}
