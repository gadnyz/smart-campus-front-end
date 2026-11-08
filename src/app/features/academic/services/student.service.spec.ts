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

    it('should list students with the filters of the API only, in snake_case', () => {
        let total = 0;
        service
            .getAll({ page: 1, size: 10, facultyId: 'fac-1', programId: 'p-1', programLevelId: 'pl-1', search: ' Lov ' })
            .subscribe((response) => (total = response.total_elements));

        const request = httpTesting.expectOne((httpRequest) => httpRequest.url === `${environment.apiBaseUrl}/api/v1/students`);
        expect(request.request.params.keys().sort()).toEqual(['faculty_id', 'page', 'program_id', 'program_level_id', 'search', 'size']);
        expect(request.request.params.get('program_level_id')).toBe('pl-1');
        expect(request.request.params.get('search')).toBe('Lov');
        request.flush({ content: [student], page: 1, size: 10, total_elements: 11, total_pages: 2 });
        expect(total).toBe(11);
    });

    it('should list the students of a promotion', () => {
        let names: (string | undefined)[] = [];
        service.getByProgramLevel('pl-1').subscribe((page) => (names = page.content.map((item) => item.last_name)));

        const request = httpTesting.expectOne((httpRequest) => httpRequest.url === `${environment.apiBaseUrl}/api/v1/students`);
        expect(request.request.params.get('program_level_id')).toBe('pl-1');
        expect(request.request.params.get('size')).toBe('100');
        request.flush({ content: [{ ...student, program_level_id: 'pl-1', level_name: 'Licence 1' }], page: 0, size: 100, total_elements: 1, total_pages: 1 });
        expect(names).toEqual(['Lovelace']);
    });

    it('should load a student by id', () => {
        let result: Student | undefined;
        service.getById('st-1').subscribe((loaded) => (result = loaded));

        const request = httpTesting.expectOne(`${environment.apiBaseUrl}/api/v1/students/st-1`);
        expect(request.request.method).toBe('GET');
        request.flush({
            ...student,
            faculty: { id: 'fac-1', name: 'Sciences informatiques' }
        });
        expect(result?.faculty_id).toBe('fac-1');
        expect(result?.faculty_name).toBe('Sciences informatiques');
    });

    it('should update a student with PUT', () => {
        let result: Student | undefined;
        service.update('st-1', { first_name: 'Ada', last_name: 'Lovelace', nationality: 'Zambienne' }).subscribe((updated) => {
            result = updated;
        });

        const request = httpTesting.expectOne(`${environment.apiBaseUrl}/api/v1/students/st-1`);
        expect(request.request.method).toBe('PUT');
        expect(request.request.body.nationality).toBe('Zambienne');
        request.flush({ ...student, nationality: 'Zambienne' });
        expect(result?.nationality).toBe('Zambienne');
    });
});
