import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@/environments/environment';
import { CourseUnitService } from './course-unit.service';

describe('CourseUnitService', () => {
    let service: CourseUnitService;
    let httpTesting: HttpTestingController;
    const baseUrl = `${environment.apiBaseUrl}/api/v1/course-units`;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
        service = TestBed.inject(CourseUnitService);
        httpTesting = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpTesting.verify());

    it('should filter the curriculum of a promotion on knowledge_skills_bloc', () => {
        service.getByProgramLevel('pl-1', 'FONDAMENTAL').subscribe();
        const request = httpTesting.expectOne((req) => req.url === `${baseUrl}/program-level/pl-1`);
        expect(request.request.params.get('knowledge_skills_bloc')).toBe('FONDAMENTAL');
        expect(request.request.params.has('knowledgeSkillsBloc')).toBeFalse();
        request.flush([]);
    });

    it('should create a course unit for a list of promotions', () => {
        service.create({ code: 'UE1', knowledge_skills_bloc: 'DEVELOPMENT', program_level_ids: ['pl-1'] }).subscribe();
        const request = httpTesting.expectOne(baseUrl);
        expect(request.request.method).toBe('POST');
        expect(request.request.body).toEqual({ code: 'UE1', knowledge_skills_bloc: 'DEVELOPMENT', program_level_ids: ['pl-1'] });
        request.flush({ id: 'u-1', code: 'UE1', faculty_id: 'f-1', curriculum: [{ program_level_id: 'pl-1', knowledge_skills_bloc: 'DEVELOPMENT' }] });
    });

    it('should update the code only, and the bloc per promotion', () => {
        service.update('u-1', { code: 'UE1B' }).subscribe();
        const update = httpTesting.expectOne(`${baseUrl}/u-1`);
        expect(update.request.method).toBe('PUT');
        expect(update.request.body).toEqual({ code: 'UE1B' });
        update.flush({});

        service.changeBloc('u-1', 'pl-1', 'CROSS_FUNCTIONAL').subscribe();
        const bloc = httpTesting.expectOne(`${baseUrl}/u-1/program-levels/pl-1`);
        expect(bloc.request.method).toBe('PUT');
        expect(bloc.request.body).toEqual({ knowledge_skills_bloc: 'CROSS_FUNCTIONAL' });
        bloc.flush({ program_level_id: 'pl-1', knowledge_skills_bloc: 'CROSS_FUNCTIONAL' });
    });

    it('should list, attach and detach the courses of a course unit', () => {
        service.getCourses('u-1').subscribe();
        httpTesting.expectOne(`${baseUrl}/u-1/courses`).flush([]);

        service.attachCourse('u-2', { course_id: 'c-1', credits: 3 }).subscribe();
        const attach = httpTesting.expectOne(`${baseUrl}/u-2/courses`);
        expect(attach.request.method).toBe('POST');
        expect(attach.request.body).toEqual({ course_id: 'c-1', credits: 3 });
        attach.flush({ course_id: 'c-1', code: 'ALG', name: 'Algo', credits: 3 });

        service.detachCourse('u-1', 'c-1').subscribe();
        const detach = httpTesting.expectOne(`${baseUrl}/u-1/courses/c-1`);
        expect(detach.request.method).toBe('DELETE');
        detach.flush(null);
    });
});
