// import { formatDate } from '@angular/common';
import { CandidateDocumentType, CandidateGender, CandidatureStatus, CandidatureType, MaritalStatus } from '../models/candidate.model';

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