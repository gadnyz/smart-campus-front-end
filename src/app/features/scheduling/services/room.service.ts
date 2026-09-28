import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@/environments/environment';
import { Room, RoomRequest } from '../models/room.model';

/**
 * `GET /api/v1/rooms` renvoie un tableau complet (`RoomResponse[]`), sans pagination
 * ni paramètre de requête (vérifié sur le backend le 28/09/2026) : `getAll()` n'a donc
 * pas besoin de parcourir des pages, contrairement à `IdentityManagementService.getAllPrivileges()`.
 */
@Injectable({ providedIn: 'root' })
export class RoomService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/rooms`;

    getAll(): Observable<Room[]> {
        return this.http.get<Room[]>(this.baseUrl);
    }

    getById(id: string): Observable<Room> {
        return this.http.get<Room>(`${this.baseUrl}/${id}`);
    }

    create(payload: RoomRequest): Observable<Room> {
        return this.http.post<Room>(this.baseUrl, payload);
    }

    update(id: string, payload: RoomRequest): Observable<Room> {
        return this.http.put<Room>(`${this.baseUrl}/${id}`, payload);
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }
}
