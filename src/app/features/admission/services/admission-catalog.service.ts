import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@/environments/environment';
import { PagedResponse } from '../models/candidate.model';

export interface AdmissionCatalogItem {
    id: string;
    name: string;
    code?: string;
}

@Injectable({ providedIn: 'root' })
export class AdmissionCatalogService {
    private readonly http = inject(HttpClient);

    getFaculties(): Observable<PagedResponse<AdmissionCatalogItem>> {
        return this.http.get<PagedResponse<AdmissionCatalogItem>>(`${environment.apiBaseUrl}/api/v1/faculties`, {
            params: this.defaultParams()
        });
    }

    getProgramsByFaculty(facultyId: string): Observable<PagedResponse<AdmissionCatalogItem>> {
        return this.http.get<PagedResponse<AdmissionCatalogItem>>(`${environment.apiBaseUrl}/api/v1/programs/faculty/${facultyId}`, {
            params: this.defaultParams()
        });
    }

    getLevels(): Observable<PagedResponse<AdmissionCatalogItem>> {
        return this.http.get<PagedResponse<AdmissionCatalogItem>>(`${environment.apiBaseUrl}/api/v1/levels`, {
            params: this.defaultParams()
        });
    }

    private defaultParams(): HttpParams {
        return new HttpParams().set('page', 0).set('size', 100).set('sort', 'name,asc');
    }
}