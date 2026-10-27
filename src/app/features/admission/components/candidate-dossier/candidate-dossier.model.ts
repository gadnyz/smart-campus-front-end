import { CandidateDocument, CandidateDocumentType, CandidateResponse } from '../../models/candidate.model';
import { CandidateAcademicLabels } from '../../services/admission-academic-reference.service';
import {
    formatCandidateDate,
    formatCandidateDateTime,
    formatCandidateGender,
    formatCandidatureType,
    formatMaritalStatus
} from '../../utils/candidate-format';

/**
 * Lecture du dossier d'un candidat, partagée par « Mon dossier » (le candidat) et le détail
 * d'une candidature (le personnel) : mêmes rubriques, mêmes pièces, mêmes libellés.
 */
export const EMPTY_VALUE = '—';

export interface DossierField {
    label: string;
    value: string;
    wide?: boolean;
}

export interface DossierSection {
    id: string;
    title: string;
    icon: string;
    groups: { title?: string; fields: DossierField[] }[];
}

export interface RequiredDocument {
    type: CandidateDocumentType;
    label: string;
    document: CandidateDocument | null;
}

/** Pièces exigées d'un dossier, dans l'ordre d'affichage. La photo sert d'avatar. */
export const REQUIRED_DOCUMENT_TYPES: readonly { type: CandidateDocumentType; label: string }[] = [
    { type: 'ID_CARD', label: 'Pièce d’identité' },
    { type: 'DIPLOMA', label: 'Diplôme' },
    { type: 'TRANSCRIPT', label: 'Bulletins / Relevés de notes' },
    { type: 'PAYMENT_SLIP', label: 'Preuve de paiement' }
];

export function candidateFullName(candidate: Pick<CandidateResponse, 'first_name' | 'middle_name' | 'last_name'>): string {
    return [candidate.first_name, candidate.middle_name, candidate.last_name].filter(Boolean).join(' ');
}

export function candidateInitials(candidate: Pick<CandidateResponse, 'first_name' | 'last_name'>): string {
    return `${candidate.first_name?.trim().charAt(0) ?? ''}${candidate.last_name?.trim().charAt(0) ?? ''}`.toUpperCase() || '?';
}

export function photoDocument(candidate: CandidateResponse | null): CandidateDocument | null {
    return candidate?.documents?.find((document) => document.document_type === 'PHOTO') ?? null;
}

export function requiredDocuments(candidate: CandidateResponse | null): RequiredDocument[] {
    const documents = candidate?.documents ?? [];
    return REQUIRED_DOCUMENT_TYPES.map(({ type, label }) => ({
        type,
        label,
        document: documents.find((document) => document.document_type === type) ?? null
    }));
}

function text(value: unknown): string {
    return value === null || value === undefined || value === '' ? EMPTY_VALUE : String(value);
}

export function buildDossierSections(candidate: CandidateResponse, labels: CandidateAcademicLabels | null): DossierSection[] {
    const school = candidate.academic_background;
    return [
        {
            id: 'identity',
            title: 'Identité',
            icon: 'pi pi-user',
            groups: [
                {
                    title: 'Informations générales',
                    fields: [
                        { label: 'Nom', value: text(candidate.last_name) },
                        { label: 'Post-nom', value: text(candidate.middle_name) },
                        { label: 'Prénom', value: text(candidate.first_name) },
                        { label: 'Genre', value: text(candidate.gender && formatCandidateGender(candidate.gender)) },
                        { label: 'Date de naissance', value: text(formatCandidateDate(candidate.birth_date)) },
                        { label: 'Lieu de naissance', value: text(candidate.birth_place) },
                        { label: 'État civil', value: text(candidate.marital_status && formatMaritalStatus(candidate.marital_status)) },
                        { label: 'Nationalité', value: text(candidate.nationality) }
                    ]
                },
                {
                    title: 'Coordonnées',
                    fields: [
                        { label: 'Email', value: text(candidate.email) },
                        { label: 'Téléphone', value: text(candidate.phone) }
                    ]
                },
                {
                    title: 'Origine',
                    fields: [
                        { label: 'Province', value: text(candidate.origin?.province) },
                        { label: 'Territoire', value: text(candidate.origin?.territory) },
                        { label: 'Secteur', value: text(candidate.origin?.sector) },
                        { label: 'Village / Commune', value: text(candidate.origin?.commune) }
                    ]
                }
            ]
        },
        {
            id: 'academic',
            title: 'Choix académique',
            icon: 'pi pi-building-columns',
            groups: [
                {
                    fields: [
                        { label: 'Faculté', value: text(labels?.facultyLabel) },
                        { label: 'Filière', value: text(labels?.programLabel) },
                        { label: 'Promotion', value: text(labels?.levelLabel) },
                        { label: 'Type de candidature', value: text(candidate.candidature?.type && formatCandidatureType(candidate.candidature.type)) },
                        { label: 'Soumise le', value: text(formatCandidateDateTime(candidate.candidature?.submitted_at)) }
                    ]
                }
            ]
        },
        {
            id: 'schooling',
            title: 'Parcours scolaire',
            icon: 'pi pi-book',
            groups: [
                {
                    fields: [
                        { label: 'École', value: text(school?.school_name), wide: true },
                        { label: 'Option', value: text(school?.option) },
                        { label: 'Pourcentage', value: school?.percentage != null ? `${school.percentage} %` : EMPTY_VALUE },
                        { label: 'Année d’obtention', value: text(school?.graduation_year) },
                        { label: 'Lieu d’étude', value: text([school?.study_city, school?.study_country].filter(Boolean).join(', ')) }
                    ]
                }
            ]
        },
        {
            id: 'contacts',
            title: 'Tuteur et contact d’urgence',
            icon: 'pi pi-users',
            groups: [
                {
                    title: 'Tuteur',
                    fields: [
                        { label: 'Nom complet', value: text(candidate.tutor?.full_name) },
                        { label: 'Profession', value: text(candidate.tutor?.profession) },
                        { label: 'Téléphone', value: text(candidate.tutor?.phone) },
                        { label: 'Email', value: text(candidate.tutor?.email) }
                    ]
                },
                {
                    title: 'Contact d’urgence',
                    fields: [
                        { label: 'Nom complet', value: text(candidate.emergency_contact?.full_name) },
                        { label: 'Lien', value: text(candidate.emergency_contact?.relationship) },
                        { label: 'Téléphone', value: text(candidate.emergency_contact?.phone) },
                        { label: 'Email', value: text(candidate.emergency_contact?.email) }
                    ]
                }
            ]
        }
    ];
}
