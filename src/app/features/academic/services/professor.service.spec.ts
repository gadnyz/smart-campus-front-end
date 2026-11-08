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
    /** Une page de `GET /professors`, telle que le service la demande pour tout charger. */
    const isList = (facultyId?: string) => (req: { url: string; params: { get(name: string): string | null } }) =>
        req.url === baseUrl && req.params.get('size') === '100' && req.params.get('faculty_id') === (facultyId ?? null);

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

    it('should load every page of professors, beyond the 100 of a single page', () => {
        let result: Professor[] | undefined;
        service.getAll().subscribe((professors) => (result = professors));

        const first = httpTesting.expectOne(isList());
        expect(first.request.params.get('page')).toBe('0');
        expect(first.request.params.get('sort')).toBe('last_name,asc');
        first.flush({ content: [professor], page: 0, size: 100, total_elements: 101, total_pages: 2 });
        const second = httpTesting.expectOne(isList());
        expect(second.request.params.get('page')).toBe('1');
        second.flush({ content: [{ ...professor, id: 'prof-2' }], page: 1, size: 100, total_elements: 101, total_pages: 2 });

        expect(result?.map((item) => item.id)).toEqual(['prof-1', 'prof-2']);
    });

    it('should search a page of professors with the query parameters of the API', () => {
        service.list({ facultyId: 'fac-1', professorGradeId: 'grade-1', search: 'Mbu', page: 2, size: 20 }).subscribe();

        const request = httpTesting.expectOne((req) => req.url === baseUrl);
        expect(request.request.params.keys().sort()).toEqual(['faculty_id', 'page', 'professor_grade_id', 'search', 'size']);
        request.flush({ content: [], page: 2, size: 20, total_elements: 0, total_pages: 0 });
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
        httpTesting.expectOne(isList('fac-1')).flush({ content: [professor], page: 0, size: 100, total_elements: 1, total_pages: 1 });

        service.getByGrade('grade-1').subscribe((items) => (byGrade = items));
        httpTesting
            .expectOne((req) => req.url === baseUrl && req.params.get('professor_grade_id') === 'grade-1')
            .flush({ content: [professor], page: 0, size: 100, total_elements: 1, total_pages: 1 });

        expect(byFaculty?.[0].id).toBe('prof-1');
        expect(byGrade?.[0].id).toBe('prof-1');
    });

    it('should create, update and delete a professor', () => {
        service.create(payload).subscribe();
        const create = httpTesting.expectOne(baseUrl);
        expect(create.request.method).toBe('POST');
        // Le corps du contrat, sans grade_id, matricule ni user_id.
        expect(create.request.body).toEqual(payload);
        create.flush(professor);

        service.update('prof-1', payload).subscribe();
        const update = httpTesting.expectOne(`${baseUrl}/prof-1`);
        expect(update.request.method).toBe('PUT');
        expect(update.request.body.professor_grade_id).toBe('grade-1');
        expect('grade_id' in update.request.body).toBeFalse();
        expect('email' in update.request.body).toBeFalse();
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
        httpTesting.expectOne(isList()).flush({ content: [professor], page: 0, size: 100, total_elements: 1, total_pages: 1 });
        expect(result?.id).toBe('prof-1');
    });

    it('should return null when the current user is not a professor', () => {
        let result: Professor | null | undefined;
        service.resolveCurrent('other', 'nobody@smart-campus.org').subscribe((item) => (result = item));

        httpTesting.expectOne(`${baseUrl}/me`).flush({ detail: 'Not found' }, { status: 404, statusText: 'Not Found' });
        httpTesting.expectOne(isList()).flush({ content: [professor], page: 0, size: 100, total_elements: 1, total_pages: 1 });
        expect(result).toBeNull();
    });
});
