import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@/environments/environment';
import { Professor, ProfessorRequest } from '../models/professor.model';
import { ProfessorService } from './professor.service';

describe('ProfessorService', () => {
    let service: ProfessorService;
    let httpTesting: HttpTestingController;
    const baseUrl = `${environment.apiBaseUrl}/api/v1/professors`;

    const professor: Professor = {
        id: 'prof-1',
        first_name: 'Jean',
        last_name: 'Mbuyi',
        email: 'jean.mbuyi@smart-campus.org',
        faculty_id: 'fac-1',
        professor_grade_id: 'grade-1',
        user_id: 'user-1'
    };

    const payload: ProfessorRequest = {
        faculty_id: 'fac-1',
        professor_grade_id: 'grade-1',
        first_name: 'Jean',
        last_name: 'Mbuyi',
        middle_name: 'Kabongo',
        gender: 'MALE',
        birth_date: '1980-05-15',
        birth_place: 'Kinshasa',
        marital_status: 'MARRIED',
        nationality: 'Congolaise',
        email: 'jean.mbuyi@smart-campus.org',
        phone: '+243840000001'
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()]
        });
        service = TestBed.inject(ProfessorService);
        httpTesting = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpTesting.verify();
    });

    it('should list professors from an array payload', () => {
        let result: Professor[] | undefined;
        service.getAll().subscribe((professors) => (result = professors));

        const request = httpTesting.expectOne(baseUrl);
        expect(request.request.method).toBe('GET');
        request.flush([professor]);

        expect(result).toEqual([professor]);
    });

    it('should unwrap a paged professors payload', () => {
        let result: Professor[] | undefined;
        service.getAll().subscribe((professors) => (result = professors));

        httpTesting.expectOne(baseUrl).flush({ content: [professor] });
        expect(result).toEqual([professor]);
    });

    it('should get a professor by id', () => {
        let result: Professor | undefined;
        service.getById('prof-1').subscribe((item) => (result = item));

        const request = httpTesting.expectOne(`${baseUrl}/prof-1`);
        expect(request.request.method).toBe('GET');
        request.flush(professor);
        expect(result).toEqual(professor);
    });

    it('should get professors by faculty and grade', () => {
        let byFaculty: Professor[] | undefined;
        let byGrade: Professor[] | undefined;
        service.getByFaculty('fac-1').subscribe((items) => (byFaculty = items));
        httpTesting.expectOne(`${baseUrl}/faculty/fac-1`).flush([professor]);

        service.getByGrade('grade-1').subscribe((items) => (byGrade = items));
        httpTesting.expectOne(`${baseUrl}/grade/grade-1`).flush({ content: [professor] });

        expect(byFaculty).toEqual([professor]);
        expect(byGrade).toEqual([professor]);
    });

    it('should create, update and delete a professor', () => {
        service.create(payload).subscribe();
        const create = httpTesting.expectOne(baseUrl);
        expect(create.request.method).toBe('POST');
        expect(create.request.body).toEqual(payload);
        create.flush(professor);

        service.update('prof-1', payload).subscribe();
        const update = httpTesting.expectOne(`${baseUrl}/prof-1`);
        expect(update.request.method).toBe('PUT');
        update.flush(professor);

        service.delete('prof-1').subscribe();
        const del = httpTesting.expectOne(`${baseUrl}/prof-1`);
        expect(del.request.method).toBe('DELETE');
        del.flush(null);
    });

    it('should resolve the current professor from /me', () => {
        let result: Professor | null | undefined;
        service.resolveCurrent('user-1', professor.email).subscribe((item) => (result = item));

        httpTesting.expectOne(`${baseUrl}/me`).flush(professor);
        expect(result).toEqual(professor);
    });

    it('should fall back to getAll when /me is unavailable', () => {
        let result: Professor | null | undefined;
        service.resolveCurrent('user-1', professor.email).subscribe((item) => (result = item));

        httpTesting.expectOne(`${baseUrl}/me`).flush({ detail: 'Not found' }, { status: 404, statusText: 'Not Found' });
        httpTesting.expectOne(baseUrl).flush([professor]);
        expect(result).toEqual(professor);
    });

    it('should return null when the current user is not a professor', () => {
        let result: Professor | null | undefined;
        service.resolveCurrent('other', 'nobody@smart-campus.org').subscribe((item) => (result = item));

        httpTesting.expectOne(`${baseUrl}/me`).flush({ detail: 'Not found' }, { status: 404, statusText: 'Not Found' });
        httpTesting.expectOne(baseUrl).flush([professor]);
        expect(result).toBeNull();
    });
});
