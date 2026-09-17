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

        const request = httpTesting.expectOne(`${environment.apiBaseUrl}/api/v1/students/course/course-1`);
        expect(request.request.method).toBe('GET');
        request.flush([student]);
        expect(result).toEqual([student]);
    });

    it('should unwrap a paged enrollment payload', () => {
        let result: Student[] | undefined;
        service.getByCourse('course-1').subscribe((students) => (result = students));

        httpTesting
            .expectOne(`${environment.apiBaseUrl}/api/v1/students/course/course-1`)
            .flush({ content: [student] });
        expect(result).toEqual([student]);
    });
});
