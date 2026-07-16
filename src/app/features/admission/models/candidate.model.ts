export type CandidateGender = 'MALE' | 'FEMALE' | 'OTHER';
export type MaritalStatus = 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED' | 'OTHER';
export type CandidatureType = 'NEW' | 'SPECIAL';
export type CandidatureStatus = 'DRAFT' | 'PENDING' | 'VALIDATED' | 'REJECTED' | 'CANCELLED';
export type CandidateDocumentType = 'PAYMENT_SLIP' | 'ID_CARD' | 'DIPLOMA' | 'TRANSCRIPT' | 'PHOTO';

export interface CandidateOrigin {
    province: string;
    territory: string;
    sector: string;
    commune: string;
}

export interface CandidateTutor {
    full_name: string;
    email: string;
    phone: string;
    profession: string;
}

export interface CandidateEmergencyContact {
    full_name: string;
    email: string;
    phone: string;
    relationship: string;
}

export interface CandidateAcademicBackground {
    school_name: string;
    option: string;
    percentage: number;
    graduation_year: number;
    study_country: string;
    study_city: string;
}

export interface CandidateCandidature {
    type: CandidatureType;
}

export interface SubmitCandidatureRequest {
    faculty_id: string;
    program_id: string;
    level_id: string;
    first_name: string;
    last_name: string;
    middle_name: string;
    gender: CandidateGender;
    birth_date: string;
    birth_place: string;
    marital_status: MaritalStatus;
    nationality: string;
    email: string;
    phone: string;
    origin: CandidateOrigin;
    tutor: CandidateTutor;
    emergency_contact: CandidateEmergencyContact;
    academic_background: CandidateAcademicBackground;
    candidature: CandidateCandidature;
}

export interface CandidateResponse extends SubmitCandidatureRequest {
    id: string;
    academic_year_id: string;
    candidature: CandidateCandidature & {
        status: CandidatureStatus;
        submitted_at: string;
    };
    documents: CandidateDocument[];
    created_at: string;
    updated_at: string;
}

export interface CandidateDocument {
    id: string;
    document_type: CandidateDocumentType;
    file_url: string;
    file_name?: string;
    content_type?: string;
    size_bytes?: number;
    uploaded_at: string;
}

export interface CandidateQuery {
    status?: CandidatureStatus;
    facultyId?: string;
    page?: number;
    size?: number;
    sort?: string[];
}

export interface PagedResponse<T> {
    content: T[];
    page: number;
    size: number;
    total_elements: number;
    total_pages: number;
}

export interface DocumentUploadUrlResponse {
    upload_url: string;
    object_path: string;
}

export interface ConfirmDocumentRequest {
    object_path: string;
    type: CandidateDocumentType;
}

export interface ConfirmDocumentResponse {
    file_url: string;
    type: CandidateDocumentType;
}

export interface CandidateListItem {
    id: string;
    first_name: string;
    last_name: string;
    middle_name: string;
    gender: CandidateGender;
    email: string;
    phone: string;
    status: CandidatureStatus;
    submitted_at: string;
    created_at: string;
}