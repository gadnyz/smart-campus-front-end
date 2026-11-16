import { Pipe, PipeTransform } from '@angular/core';

/**
 * Libellés français des profils métier. L'API garde ses codes (`ACADEMIC_SECRETARY`…) : seul
 * l'affichage est traduit, les appels et les filtres continuent d'utiliser le code.
 */
const PROFILE_LABELS: Readonly<Record<string, string>> = {
    ADMIN: 'Administrateur',
    ACADEMIC_SECRETARY: 'Secrétaire académique',
    PROFESSOR: 'Professeur',
    STUDENT: 'Étudiant',
    CANDIDATE: 'Candidat',
    SCHOLARSHIP: 'Boursier'
};

/** `ACADEMIC_SECRETARY` → « Secrétaire académique ». Un code inconnu est rendu lisible tel quel. */
export function profileLabel(code: string | null | undefined): string {
    if (!code) {
        return '';
    }
    const known = PROFILE_LABELS[code.toUpperCase()];
    if (known) {
        return known;
    }
    const words = code.replace(/[_-]+/g, ' ').trim().toLocaleLowerCase('fr-FR');
    return words.charAt(0).toLocaleUpperCase('fr-FR') + words.slice(1);
}

@Pipe({ name: 'profileLabel' })
export class ProfileLabelPipe implements PipeTransform {
    transform(code: string | null | undefined): string {
        return profileLabel(code);
    }
}
