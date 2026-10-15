import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@/environments/environment';
import { CreateTimetableRequest } from '../models/timetable.model';
import { TimetableService } from './timetable.service';

describe('TimetableService', () => {
    let service: TimetableService;
    let httpTesting: HttpTestingController;
    const baseUrl = `${environment.apiBaseUrl}/api/v1/timetables`;

    const raw = {
        id: 'tt-1',
        academic_year_id: 'year-1',
        program_level_id: 'pl-1',
        program_level_name: 'L1',
        week_start: '2026-10-05',
        week_end: '2026-10-11',
        program_id: 'prog-1',
        program_name: 'Informatique',
        faculty_id: 'fac-1',
        faculty_name: 'Sciences',
        status: 'DRAFT',
        created_at: '2026-10-01T00:00:00Z',
        updated_at: '2026-10-01T00:00:00Z'
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()]
        });
        service = TestBed.inject(TimetableService);
        httpTesting = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpTesting.verify());

    it('should list with only the given filters, week included', () => {
        let total = -1;
        service.list({ programLevelId: 'pl-1', week: '2026-10-07', status: 'DRAFT', page: 0, size: 1, sort: ['weekStart,asc'] }).subscribe((page) => {
            total = page.total_elements;
        });

        const request = httpTesting.expectOne((req) => req.url === baseUrl);
        expect(request.request.params.keys().sort()).toEqual(['page', 'programLevelId', 'size', 'sort', 'status', 'week']);
        expect(request.request.params.get('week')).toBe('2026-10-07');
        request.flush({ content: [raw], page: 0, size: 1, total_elements: 3, total_pages: 3 });

        expect(total).toBe(3);
    });

    it('should create and map the response', () => {
        const payload: CreateTimetableRequest = {
            academic_year_id: 'year-1',
            program_level_id: 'pl-1',
            program_level_name: 'L1',
            week_start: '2026-10-05',
            program_id: 'prog-1',
            program_name: 'Informatique',
            faculty_id: 'fac-1',
            faculty_name: 'Sciences'
        };
        let id = '';
        service.create(payload).subscribe((timetable) => (id = timetable.id));

        const request = httpTesting.expectOne(baseUrl);
        expect(request.request.method).toBe('POST');
        expect(request.request.body).toEqual(payload);
        request.flush(raw);

        expect(id).toBe('tt-1');
    });

    it('should read the week of the signed-in student', () => {
        let entries: { room_location: string; session_type: string }[] = [];
        service.getOwnWeek('2026-10-07').subscribe((items) => (entries = items));

        const request = httpTesting.expectOne((req) => req.url === `${baseUrl}/me/week`);
        expect(request.request.params.get('referenceDate')).toBe('2026-10-07');
        request.flush([{ id: 'e-1', room_location: 'Bâtiment A', session_type: 'EXAM' }]);

        expect(entries[0].room_location).toBe('Bâtiment A');
        expect(entries[0].session_type).toBe('EXAM');
    });

    it('should get by id and delete', () => {
        service.getById('tt-1').subscribe();
        httpTesting.expectOne(`${baseUrl}/tt-1`).flush(raw);

        service.delete('tt-1').subscribe();
        const request = httpTesting.expectOne(`${baseUrl}/tt-1`);
        expect(request.request.method).toBe('DELETE');
        request.flush(null);
    });
});
