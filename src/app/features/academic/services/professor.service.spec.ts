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
    const listUrl = `${baseUrl}?page=0&size=100`;

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

        const request = httpTesting.expectOne(listUrl);
        expect(request.request.method).toBe('GET');
        request.flush([professor]);

        expect(result).toEqual([jasmine.objectContaining(professor)]);
    });

    it('should unwrap a paged professors payload', () => {
        let result: Professor[] | undefined;
        service.getAll().subscribe((professors) => (result = professors));

        httpTesting.expectOne(listUrl).flush({ content: [professor] });
        expect(result?.[0].id).toBe('prof-1');
    });

    it('should normalize nested faculty and grade on getById', () => {
        let result: Professor | undefined;
        service.getById('prof-1').subscribe((item) => (result = item));

        const request = httpTesting.expectOne(`${baseUrl}/prof-1`);
        expect(request.request.method).toBe('GET');
        request.flush({
            ...professor,
            faculty: { id: 'fac-9', name: 'Droit' },
            professor_grade: { id: 'grade-9', name: 'Assistant', code: 'ASS' }
        });
        expect(result?.faculty_id).toBe('fac-9');
        expect(result?.professor_grade_id).toBe('grade-9');
        expect(result?.faculty_name).toBe('Droit');
    });

    it('should get professors by faculty and grade', () => {
        let byFaculty: Professor[] | undefined;
        let byGrade: Professor[] | undefined;
        service.getByFaculty('fac-1').subscribe((items) => (byFaculty = items));
        httpTesting.expectOne(`${baseUrl}/faculty/fac-1?page=0&size=100`).flush([professor]);

        service.getByGrade('grade-1').subscribe((items) => (byGrade = items));
        httpTesting.expectOne(`${baseUrl}/grade/grade-1?page=0&size=100`).flush({ content: [professor] });

        expect(byFaculty?.[0].id).toBe('prof-1');
        expect(byGrade?.[0].id).toBe('prof-1');
    });

    it('should create, update and delete a professor', () => {
        service.create(payload).subscribe();
        const create = httpTesting.expectOne(baseUrl);
        expect(create.request.method).toBe('POST');
        expect(create.request.body).toEqual({ ...payload, grade_id: 'grade-1' });
        create.flush(professor);

        service.update('prof-1', payload).subscribe();
        const update = httpTesting.expectOne(`${baseUrl}/prof-1`);
        expect(update.request.method).toBe('PUT');
        expect(update.request.body.grade_id).toBe('grade-1');
        expect(update.request.body.professor_grade_id).toBe('grade-1');
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
        expect(result?.id).toBe('prof-1');
    });

    it('should fall back to getAll when /me is unavailable', () => {
        let result: Professor | null | undefined;
        service.resolveCurrent('user-1', professor.email).subscribe((item) => (result = item));

        httpTesting.expectOne(`${baseUrl}/me`).flush({ detail: 'Not found' }, { status: 404, statusText: 'Not Found' });
        httpTesting.expectOne(listUrl).flush([professor]);
        expect(result?.id).toBe('prof-1');
    });

    it('should return null when the current user is not a professor', () => {
        let result: Professor | null | undefined;
        service.resolveCurrent('other', 'nobody@smart-campus.org').subscribe((item) => (result = item));

        httpTesting.expectOne(`${baseUrl}/me`).flush({ detail: 'Not found' }, { status: 404, statusText: 'Not Found' });
        httpTesting.expectOne(listUrl).flush([professor]);
        expect(result).toBeNull();
    });
});
