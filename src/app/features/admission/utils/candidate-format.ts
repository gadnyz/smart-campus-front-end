import { CandidateDocument, CandidateDocumentType, CandidateGender, CandidatureStatus, CandidatureType, MaritalStatus } from '../models/candidate.model';

export type CandidateDocumentKind = 'image' | 'pdf' | 'unknown';

export type CandidateStatusSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary';

const GENDER_LABEL: Record<CandidateGender, string> = {
    MALE: 'Masculin',
    FEMALE: 'Féminin',
    OTHER: 'Autre'
};

const MARITAL_STATUS_LABEL: Record<MaritalStatus, string> = {
    SINGLE: 'Célibataire',
    MARRIED: 'Marié(e)',
    DIVORCED: 'Divorcé(e)',
    WIDOWED: 'Veuf / Veuve',
    OTHER: 'Autre'
};

const CANDIDATURE_TYPE_LABEL: Record<CandidatureType, string> = {
    NEW: 'Nouvelle inscription',
    SPECIAL: 'Inscription spéciale'
};

const CANDIDATURE_STATUS_LABEL: Record<CandidatureStatus, string> = {
    DRAFT: 'Brouillon',
    PENDING: 'En attente',
    VALIDATED: 'Validée',
    REJECTED: 'Rejetée',
    CANCELLED: 'Annulée'
};

const CANDIDATURE_STATUS_SEVERITY: Record<CandidatureStatus, CandidateStatusSeverity> = {
    DRAFT: 'secondary',
    PENDING: 'warn',
    VALIDATED: 'success',
    REJECTED: 'danger',
    CANCELLED: 'secondary'
};

const DOCUMENT_TYPE_LABEL: Record<CandidateDocumentType, string> = {
    PAYMENT_SLIP: 'Preuve de paiement',
    ID_CARD: 'Pièce d’identité',
    DIPLOMA: 'Diplôme',
    TRANSCRIPT: 'Relevé de notes',
    PHOTO: 'Photo'
};

export function formatCandidateGender(value: CandidateGender): string {
    return GENDER_LABEL[value];
}

export function formatMaritalStatus(value: MaritalStatus): string {
    return MARITAL_STATUS_LABEL[value];
}

export function formatCandidatureType(value: CandidatureType): string {
    return CANDIDATURE_TYPE_LABEL[value];
}

export function formatCandidatureStatus(value: CandidatureStatus): string {
    return CANDIDATURE_STATUS_LABEL[value];
}

export function candidateStatusSeverity(value: CandidatureStatus): CandidateStatusSeverity {
    return CANDIDATURE_STATUS_SEVERITY[value];
}

export function formatCandidateDocumentType(value: CandidateDocumentType): string {
    return DOCUMENT_TYPE_LABEL[value];
}

/** Prefer document_type, then file metadata (extension, MIME). */
export function resolveCandidateDocumentKind(
    document: Pick<
        CandidateDocument,
        'document_type' | 'content_type' | 'file_name' | 'file_url'
    >
): CandidateDocumentKind {
    if (document.document_type === 'PHOTO') {
        return 'image';
    }

    const fromMetadata = inferDocumentKindFromMetadata(document);

    if (fromMetadata !== 'unknown') {
        return fromMetadata;
    }

    switch (document.document_type) {
        case 'ID_CARD':
            return 'image';
        case 'DIPLOMA':
        case 'TRANSCRIPT':
        case 'PAYMENT_SLIP':
            return 'pdf';
        default:
            return 'unknown';
    }
}

function inferDocumentKindFromMetadata(
    document: Pick<
        CandidateDocument,
        'content_type' | 'file_name' | 'file_url'
    >
): CandidateDocumentKind {
    const source = [document.content_type, document.file_name, document.file_url]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

    if (
        source.includes('image/') ||
        /\.(png|jpe?g|webp|gif)(?:[?#]|$)/.test(source)
    ) {
        return 'image';
    }

    if (
        source.includes('application/pdf') ||
        /\.pdf(?:[?#]|$)/.test(source)
    ) {
        return 'pdf';
    }

    return 'unknown';
}

function toDate(value: string | null | undefined): Date | null {
    if (!value) {
        return null;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
}

export function formatCandidateDate(value: string | null | undefined): string {
    const date = toDate(value);

    if (!date) {
        return '-';
    }

    return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(date);
}

export function formatCandidateDateTime(value: string | null | undefined): string {
    const date = toDate(value);

    if (!date) {
        return '-';
    }

    return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}