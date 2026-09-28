import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@/environments/environment';
import { Room, RoomRequest } from '../models/room.model';
import { RoomService } from './room.service';

describe('RoomService', () => {
    let service: RoomService;
    let httpTesting: HttpTestingController;
    const baseUrl = `${environment.apiBaseUrl}/api/v1/rooms`;

    const room: Room = {
        id: 'room-1',
        name: 'A101',
        location: 'Bâtiment A',
        coordinates: null,
        capacity: 40,
        type: 'NORMAL',
        link: null,
        created_at: '2026-09-28T12:00:00Z',
        updated_at: '2026-09-28T12:00:00Z'
    };

    const payload: RoomRequest = {
        name: 'A101',
        location: 'Bâtiment A',
        capacity: 40,
        type: 'NORMAL'
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()]
        });
        service = TestBed.inject(RoomService);
        httpTesting = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpTesting.verify();
    });

    it('should list all rooms from a plain array payload (no pagination on this endpoint)', () => {
        let result: Room[] | undefined;
        service.getAll().subscribe((rooms) => (result = rooms));

        const request = httpTesting.expectOne(baseUrl);
        expect(request.request.method).toBe('GET');
        expect(request.request.params.keys().length).toBe(0);
        request.flush([room]);

        expect(result).toEqual([room]);
    });

    it('should fetch a room by id', () => {
        let result: Room | undefined;
        service.getById('room-1').subscribe((item) => (result = item));

        const request = httpTesting.expectOne(`${baseUrl}/room-1`);
        expect(request.request.method).toBe('GET');
        request.flush(room);

        expect(result).toEqual(room);
    });

    it('should create a room', () => {
        let result: Room | undefined;
        service.create(payload).subscribe((item) => (result = item));

        const request = httpTesting.expectOne(baseUrl);
        expect(request.request.method).toBe('POST');
        expect(request.request.body).toEqual(payload);
        request.flush(room);

        expect(result).toEqual(room);
    });

    it('should update a room', () => {
        const updatePayload: RoomRequest = { ...payload, capacity: 60 };
        let result: Room | undefined;
        service.update('room-1', updatePayload).subscribe((item) => (result = item));

        const request = httpTesting.expectOne(`${baseUrl}/room-1`);
        expect(request.request.method).toBe('PUT');
        expect(request.request.body).toEqual(updatePayload);
        request.flush({ ...room, capacity: 60 });

        expect(result?.capacity).toBe(60);
    });

    it('should delete a room', () => {
        let completed = false;
        service.delete('room-1').subscribe(() => (completed = true));

        const request = httpTesting.expectOne(`${baseUrl}/room-1`);
        expect(request.request.method).toBe('DELETE');
        request.flush(null);

        expect(completed).toBeTrue();
    });
});
