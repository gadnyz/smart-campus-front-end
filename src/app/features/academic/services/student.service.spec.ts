import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@/environments/environment';
import { Student } from '../models/student.model';
import { StudentService } from './student.service';

describe('StudentService', () => {
    let service: StudentService;
    let httpTesting: HttpTestingController;
    const student: Student = {
        id: 'st-1',
        first_name: 'Ada',
        last_name: 'Lovelace',
        matricule: 'FST-001',
        program_name: 'Génie Logiciel',
        level_code: 'L1'
    };
    const primaryUrl = `${environment.apiBaseUrl}/api/v1/students/course/course-1?page=0&size=100`;
    const fallbackUrl = `${environment.apiBaseUrl}/api/v1/courses/course-1/students?page=0&size=100`;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()]
        });
        service = TestBed.inject(StudentService);
        httpTesting = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpTesting.verify();
    });

    it('should list students enrolled in a course', () => {
        let result: Student[] | undefined;
        service.getByCourse('course-1').subscribe((students) => (result = students));

        const request = httpTesting.expectOne(primaryUrl);
        expect(request.request.method).toBe('GET');
        request.flush([student]);
        expect(result?.[0].matricule).toBe('FST-001');
    });

    it('should unwrap a paged enrollment payload', () => {
        let result: Student[] | undefined;
        service.getByCourse('course-1').subscribe((students) => (result = students));

        httpTesting.expectOne(primaryUrl).flush({ content: [student] });
        expect(result?.[0].id).toBe('st-1');
    });

    it('should fall back to the course students endpoint', () => {
        let result: Student[] | undefined;
        service.getByCourse('course-1').subscribe((students) => (result = students));

        httpTesting.expectOne(primaryUrl).flush({ detail: 'Not found' }, { status: 404, statusText: 'Not Found' });
        httpTesting.expectOne(fallbackUrl).flush([student]);
        expect(result?.[0].id).toBe('st-1');
    });

    it('should return an empty list when both enrollment endpoints are missing', () => {
        let result: Student[] | undefined;
        service.getByCourse('course-1').subscribe((students) => (result = students));

        httpTesting.expectOne(primaryUrl).flush({ detail: 'Not found' }, { status: 404, statusText: 'Not Found' });
        httpTesting.expectOne(fallbackUrl).flush({ detail: 'Not found' }, { status: 404, statusText: 'Not Found' });
        expect(result).toEqual([]);
    });
});
