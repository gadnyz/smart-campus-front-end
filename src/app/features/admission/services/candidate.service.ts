import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, switchMap, throwError } from 'rxjs';
import { environment } from '@/environments/environment';
import {
    CandidateDocumentType,
    CandidateQuery,
    CandidateResponse,
    ConfirmDocumentRequest,
    ConfirmDocumentResponse,
    DocumentUploadUrlResponse,
    PagedResponse,
    CandidateListItem,
    CandidatureStatus,
    SubmitCandidatureRequest,
    UpdateCandidateRequest
} from '../models/candidate.model';

type CandidateListItemApi = CandidateListItem & {
    candidature?: {
        status?: CandidatureStatus;
        submitted_at?: string;
    };
};

type CandidateResponseApi = Omit<CandidateResponse, 'candidature'> & {
    status?: CandidatureStatus;
    submitted_at?: string;
    candidature?: Partial<CandidateResponse['candidature']>;
};

@Injectable({ providedIn: 'root' })
export class CandidateService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/candidates`;

    getAll(query: CandidateQuery = {}): Observable<PagedResponse<CandidateListItem>> {
        let params = new HttpParams();

        if (query.status) params = params.set('status', query.status);
        if (query.facultyId) params = params.set('facultyId', query.facultyId);
        if (query.page !== undefined) params = params.set('page', query.page);
        if (query.size !== undefined) params = params.set('size', query.size);

        return this.http.get<PagedResponse<CandidateListItemApi>>(this.baseUrl, { params }).pipe(
            map((response) => ({
                ...response,
                content: response.content.map((candidate) => this.normalizeListItem(candidate))
            }))
        );
    }

    getById(id: string): Observable<CandidateResponse> {
        return this.http.get<CandidateResponseApi>(`${this.baseUrl}/${id}`).pipe(
            map((candidate) => this.normalizeCandidate(candidate))
        );
    }

    validate(id: string): Observable<CandidateResponse> {
        return this.http.post<void>(`${this.baseUrl}/${id}/validate`, {}).pipe(
            switchMap(() => this.getById(id))
        );
    }

    submit(payload: SubmitCandidatureRequest): Observable<CandidateResponse> {
        return this.http.post<CandidateResponse>(this.baseUrl, payload);
    }
    update(id: string, payload: UpdateCandidateRequest): Observable<CandidateResponse> {
        return throwError(() => new Error(`Endpoint update candidat non disponible côté backend: ${id}`));
    }
    requestDocumentUploadUrl(candidateId: string, type: CandidateDocumentType, extension: string): Observable<DocumentUploadUrlResponse> {
        const params = new HttpParams()
            .set('type', type)
            .set('extension', extension.startsWith('.') ? extension : `.${extension}`);

        return this.http.post<DocumentUploadUrlResponse>(`${this.baseUrl}/${candidateId}/documents/upload-url`, null, { params });
    }

    confirmDocumentUpload(candidateId: string, payload: ConfirmDocumentRequest): Observable<ConfirmDocumentResponse> {
        return this.http.post<ConfirmDocumentResponse>(`${this.baseUrl}/${candidateId}/documents/confirm`, payload);
    }

    reject(id: string): Observable<CandidateResponse> {
        return throwError(() => new Error(`Candidat rejeté ${id}`));
    }

    //     reject(id: string): Observable<CandidateResponse> {
    //     return this.http.post<void>(`${this.baseUrl}/${id}/reject`, {}).pipe(
    //         switchMap(() => this.getById(id))
    //     );
    // }

    private normalizeListItem(candidate: CandidateListItemApi): CandidateListItem {
        return {
            ...candidate,
            status: candidate.status ?? candidate.candidature?.status ?? 'DRAFT',
            submitted_at: candidate.submitted_at ?? candidate.candidature?.submitted_at ?? candidate.created_at
        };
    }

    private normalizeCandidate(candidate: CandidateResponseApi): CandidateResponse {
        return {
            ...candidate,
            candidature: {
                type: candidate.candidature?.type ?? 'NEW',
                status: candidate.candidature?.status ?? candidate.status ?? 'DRAFT',
                submitted_at: candidate.candidature?.submitted_at ?? candidate.submitted_at ?? candidate.created_at
            }
        } as CandidateResponse;
    }
}