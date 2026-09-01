import {
    HttpClient,
    HttpContext,
    HttpParams
} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of, switchMap, tap } from 'rxjs';

import { PUBLIC_API_REQUEST } from '@/app/core/auth/interceptors/public-api.context';
import { environment } from '@/environments/environment';

import {
    CandidateDocument,
    CandidateDocumentType,
    CandidateListItem,
    CandidateQuery,
    CandidateResponse,
    CandidatureStatus,
    ConfirmDocumentRequest,
    ConfirmDocumentResponse,
    DocumentDownloadUrlResponse,
    DocumentUploadUrlResponse,
    PagedResponse,
    RejectCandidatureRequest,
    SubmitCandidatureRequest
} from '../models/candidate.model';

type CandidateDocumentApi = Omit<CandidateDocument, 'document_type'> & {
    document_type?: CandidateDocumentType;
    type?: CandidateDocumentType;
};

type CandidateListItemApi = Omit<
    CandidateListItem,
    'status' | 'submitted_at'
> & {
    status?: CandidatureStatus;
    submitted_at?: string;
    candidature?: {
        status?: CandidatureStatus;
        submitted_at?: string;
    };
};

type CandidateResponseApi = Omit<
    CandidateResponse,
    'candidature' | 'documents'
> & {
    status?: CandidatureStatus;
    submitted_at?: string;
    candidature?: Partial<CandidateResponse['candidature']>;
    documents?: CandidateDocumentApi[];
};

@Injectable({ providedIn: 'root' })
export class CandidateService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl =
        `${environment.apiBaseUrl}/api/v1/candidates`;

    private readonly detailCache =
        new Map<string, CandidateResponse>();

    getAll(
        query: CandidateQuery = {}
    ): Observable<PagedResponse<CandidateListItem>> {
        let params = new HttpParams();

        if (query.status) {
            params = params.set('status', query.status);
        }

        if (query.facultyId) {
            params = params.set('facultyId', query.facultyId);
        }

        if (query.page !== undefined) {
            params = params.set('page', query.page);
        }

        if (query.size !== undefined) {
            params = params.set('size', query.size);
        }

        query.sort?.forEach((sort) => {
            params = params.append('sort', sort);
        });

        return this.http
            .get<PagedResponse<CandidateListItemApi>>(
                this.baseUrl,
                { params }
            )
            .pipe(
                map((response) => ({
                    ...response,
                    content: response.content.map((candidate) =>
                        this.normalizeListItem(candidate)
                    )
                }))
            );
    }

    getById(
        id: string,
        force = false
    ): Observable<CandidateResponse> {
        const cached = this.detailCache.get(id);

        if (cached && !force) {
            return of(cached);
        }

        return this.http
            .get<CandidateResponseApi>(`${this.baseUrl}/${id}`)
            .pipe(
                map((candidate) =>
                    this.normalizeCandidate(candidate)
                ),
                tap((candidate) =>
                    this.detailCache.set(candidate.id, candidate)
                )
            );
    }

    peekCandidate(id: string): CandidateResponse | null {
        return this.detailCache.get(id) ?? null;
    }

    prefetchCandidate(id?: string): void {
        if (!id || this.detailCache.has(id)) return;

        this.getById(id).subscribe({
            error: () => undefined
        });
    }

    validate(id: string): Observable<CandidateResponse> {
        return this.http
            .post<void>(`${this.baseUrl}/${id}/validate`, {})
            .pipe(
                switchMap(() => this.getById(id, true)),
                map((candidate) =>
                    this.withStatus(candidate, 'VALIDATED')
                )
            );
    }

    reject(id: string, reason: string): Observable<CandidateResponse> {
        const payload: RejectCandidatureRequest = { reason };

        return this.http
            .post<void>(`${this.baseUrl}/${id}/reject`, payload)
            .pipe(
                switchMap(() => this.getById(id, true)),
                map((candidate) =>
                    this.withStatus(candidate, 'REJECTED')
                )
            );
    }

    submit(
        payload: SubmitCandidatureRequest,
        options: { publicRequest?: boolean } = {}
    ): Observable<CandidateResponse> {
        return this.http
            .post<CandidateResponseApi>(
                this.baseUrl,
                payload,
                {
                    context: this.httpContext(
                        options.publicRequest
                    )
                }
            )
            .pipe(
                map((candidate) =>
                    this.normalizeCandidate(candidate)
                ),
                tap((candidate) =>
                    this.detailCache.set(candidate.id, candidate)
                )
            );
    }

    requestDocumentUploadUrl(
        candidateId: string,
        type: CandidateDocumentType,
        extension: string,
        options: { publicRequest?: boolean } = {}
    ): Observable<DocumentUploadUrlResponse> {
        const normalizedExtension = extension.startsWith('.')
            ? extension
            : `.${extension}`;

        const params = new HttpParams()
            .set('type', type)
            .set('extension', normalizedExtension);

        return this.http.post<DocumentUploadUrlResponse>(
            `${this.baseUrl}/${candidateId}/documents/upload-url`,
            null,
            {
                params,
                context: this.httpContext(
                    options.publicRequest
                )
            }
        );
    }

    uploadDocument(
        uploadUrl: string,
        file: File
    ): Observable<void> {
        return this.http.put<void>(uploadUrl, file, {
            headers: {
                'Content-Type':
                    file.type || 'application/octet-stream'
            }
        });
    }

    confirmDocumentUpload(
        candidateId: string,
        payload: ConfirmDocumentRequest,
        options: { publicRequest?: boolean } = {}
    ): Observable<ConfirmDocumentResponse> {
        return this.http.post<ConfirmDocumentResponse>(
            `${this.baseUrl}/${candidateId}/documents/confirm`,
            payload,
            {
                context: this.httpContext(
                    options.publicRequest
                )
            }
        );
    }

    getDocumentDownloadUrl(
        candidateId: string,
        documentId: string
    ): Observable<DocumentDownloadUrlResponse> {
        return this.http.get<DocumentDownloadUrlResponse>(
            `${this.baseUrl}/${candidateId}/documents/${documentId}/download-url`
        );
    }

    /** Presigned read URL for staff document preview (detail page). */
    resolveDocumentViewUrl(
        candidateId: string,
        document: Pick<CandidateDocument, 'id'>
    ): Observable<string> {
        return this.getDocumentDownloadUrl(candidateId, document.id).pipe(
            map((response) => response.file_url)
        );
    }

    clearDetailCache(id?: string): void {
        if (id) {
            this.detailCache.delete(id);
            return;
        }

        this.detailCache.clear();
    }

    private withStatus(
        candidate: CandidateResponse,
        status: CandidatureStatus
    ): CandidateResponse {
        const updated: CandidateResponse = {
            ...candidate,
            candidature: {
                ...candidate.candidature,
                status
            }
        };

        this.detailCache.set(updated.id, updated);
        return updated;
    }

    private httpContext(publicRequest?: boolean): HttpContext {
        return publicRequest
            ? new HttpContext().set(PUBLIC_API_REQUEST, true)
            : new HttpContext();
    }

    private normalizeListItem(
        candidate: CandidateListItemApi
    ): CandidateListItem {
        const status =
            candidate.status ??
            candidate.candidature?.status;

        if (!status) {
            throw new Error(
                `Statut absent pour le candidat ${candidate.id}.`
            );
        }

        return {
            ...candidate,
            status,
            submitted_at:
                candidate.submitted_at ??
                candidate.candidature?.submitted_at ??
                candidate.created_at
        };
    }

    private normalizeCandidate(
        candidate: CandidateResponseApi
    ): CandidateResponse {
        const status =
            candidate.candidature?.status ??
            candidate.status;

        const candidatureType =
            candidate.candidature?.type;

        const submittedAt =
            candidate.candidature?.submitted_at ??
            candidate.submitted_at ??
            candidate.created_at;

        if (!status) {
            throw new Error(
                `Statut absent pour le candidat ${candidate.id}.`
            );
        }

        if (!candidatureType) {
            throw new Error(
                `Type de candidature absent pour le candidat ${candidate.id}.`
            );
        }

        return {
            ...candidate,
            candidature: {
                type: candidatureType,
                status,
                submitted_at: submittedAt
            },
            documents: (candidate.documents ?? []).map(
                (document) => this.normalizeDocument(document)
            )
        } as CandidateResponse;
    }

    private normalizeDocument(
        document: CandidateDocumentApi
    ): CandidateDocument {
        const documentType =
            document.document_type ?? document.type;

        if (!documentType) {
            throw new Error(
                `Type absent pour le document ${document.id}.`
            );
        }

        return {
            ...document,
            document_type: documentType
        };
    }
}

