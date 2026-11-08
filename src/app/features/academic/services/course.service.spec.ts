import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@/environments/environment';
import { Course } from '../models/course.model';
import { CourseService } from './course.service';

describe('CourseService', () => {
    let service: CourseService;
    let httpTesting: HttpTestingController;
    const baseUrl = `${environment.apiBaseUrl}/api/v1/courses`;
    const course = (id: string): Course => ({ id, code: id.toUpperCase(), name: `Cours ${id}`, description: '', credits: 3, faculty_id: 'f-1' });
    const page = (content: Course[], index: number, totalPages: number) => ({ content, page: index, size: 100, total_elements: totalPages * 100, total_pages: totalPages });

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
        service = TestBed.inject(CourseService);
        httpTesting = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpTesting.verify());

    it('should read a paged list with faculty and search filters', () => {
        let total = 0;
        service.list({ facultyId: 'f-1', search: 'alg', page: 1, size: 20 }).subscribe((result) => (total = result.total_elements));

        const request = httpTesting.expectOne((req) => req.url === baseUrl);
        expect(request.request.params.keys().sort()).toEqual(['faculty_id', 'page', 'search', 'size']);
        request.flush({ content: [course('c1')], page: 1, size: 20, total_elements: 21, total_pages: 2 });
        expect(total).toBe(21);
    });

    it('should gather every page into a plain list', () => {
        let ids: string[] = [];
        service.getAll().subscribe((courses) => (ids = courses.map((item) => item.id)));

        httpTesting.expectOne((req) => req.url === baseUrl && req.params.get('page') === '0').flush(page([course('c1')], 0, 2));
        httpTesting.expectOne((req) => req.url === baseUrl && req.params.get('page') === '1').flush(page([course('c2')], 1, 2));
        expect(ids).toEqual(['c1', 'c2']);
    });

    it('should stop reading pages as soon as the course is found', () => {
        let found: Course | null | undefined;
        service.findById('c1').subscribe((result) => (found = result));

        httpTesting.expectOne((req) => req.url === baseUrl && req.params.get('page') === '0').flush(page([course('c1')], 0, 5));
        expect(found?.id).toBe('c1');
        // verify() : aucune page suivante demandée.
    });

    it('should answer null when the course is in no page', () => {
        let found: Course | null | undefined;
        service.findById('zz').subscribe((result) => (found = result));

        httpTesting.expectOne((req) => req.url === baseUrl && req.params.get('page') === '0').flush(page([course('c1')], 0, 1));
        expect(found).toBeNull();
    });

    it('should update a course without any course unit', () => {
        service.update('c1', { code: 'C1', name: 'Cours', description: '', credits: 4 }).subscribe();
        const request = httpTesting.expectOne(`${baseUrl}/c1`);
        expect(request.request.body).toEqual({ code: 'C1', name: 'Cours', description: '', credits: 4 });
        request.flush(course('c1'));
    });
});
