import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@/environments/environment';
import { TimetableEntry, TimetableEntryItemRequest } from '../models/timetable-entry.model';
import { TimetableEntryService } from './timetable-entry.service';

describe('TimetableEntryService', () => {
    let service: TimetableEntryService;
    let httpTesting: HttpTestingController;
    const baseUrl = `${environment.apiBaseUrl}/api/v1/timetable-entries`;

    const item: TimetableEntryItemRequest = {
        date: '2026-10-05',
        start_hour: '08:00:00',
        end_hour: '10:00:00',
        room_id: 'room-1',
        course_assignment_id: 'ca-1',
        session_type: 'LECTURE'
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()]
        });
        service = TestBed.inject(TimetableEntryService);
        httpTesting = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpTesting.verify());

    it('should refuse a batch without timetable id, without any request', () => {
        let failed = false;
        service.create({ timetable_id: '', entries: [item] }).subscribe({ error: () => (failed = true) });
        expect(failed).toBeTrue();
    });

    it('should create a batch and map every entry', () => {
        let created: TimetableEntry[] = [];
        service.create({ timetable_id: 'tt-1', entries: [item] }).subscribe((entries) => (created = entries));

        const request = httpTesting.expectOne(baseUrl);
        expect(request.request.method).toBe('POST');
        request.flush([{ ...item, id: 'e-1', session_type: 'UNKNOWN' }]);

        expect(created.length).toBe(1);
        expect(created[0].id).toBe('e-1');
        expect(created[0].note).toBe('');
    });

    it('should read the entries of a timetable', () => {
        let count = -1;
        service.getByTimetable('tt-1').subscribe((entries) => (count = entries.length));
        httpTesting.expectOne(`${baseUrl}/timetable/tt-1`).flush([{ id: 'e-1' }, { id: 'e-2' }]);
        expect(count).toBe(2);
    });

    it('should read the week of a timetable and the sessions of a course assignment', () => {
        let week = -1;
        service.getForWeek('tt-1', '2026-10-05').subscribe((entries) => (week = entries.length));
        const weekRequest = httpTesting.expectOne((req) => req.url === `${baseUrl}/timetable/tt-1/week`);
        expect(weekRequest.request.params.get('referenceDate')).toBe('2026-10-05');
        weekRequest.flush([{ id: 'e-1' }]);
        expect(week).toBe(1);

        let assigned = -1;
        service.getByCourseAssignment('ca-1').subscribe((entries) => (assigned = entries.length));
        httpTesting.expectOne(`${baseUrl}/course-assignment/ca-1`).flush([{ id: 'e-1' }, { id: 'e-2' }]);
        expect(assigned).toBe(2);
    });

    it('should update and delete an entry', () => {
        service.update('e-1', item).subscribe();
        const update = httpTesting.expectOne(`${baseUrl}/e-1`);
        expect(update.request.method).toBe('PUT');
        update.flush({ ...item, id: 'e-1' });

        service.delete('e-1').subscribe();
        const remove = httpTesting.expectOne(`${baseUrl}/e-1`);
        expect(remove.request.method).toBe('DELETE');
        remove.flush(null);
    });
});
