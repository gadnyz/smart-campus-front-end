import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Observable, of, throwError } from 'rxjs';
import { DetailNavigationService } from '@/app/shared/navigation/detail-navigation.service';
import { CourseAssignment } from '../../models/course-assignment.model';
import { CourseAssignmentService } from '../../services/course-assignment.service';
import { MyCoursesPage } from './my-courses';

describe('MyCoursesPage', () => {
    let component: MyCoursesPage;
    let fixture: ComponentFixture<MyCoursesPage>;
    let assignmentService: jasmine.SpyObj<CourseAssignmentService>;
    let router: Router;

    const assignment = (id: string, code: string, status: CourseAssignment['status'] = 'ACTIVE'): CourseAssignment => ({
        id,
        course_id: `c-${id}`,
        course_code: code,
        course_name: `Cours ${code}`,
        professor_id: 'p-1',
        academic_year_id: 'year-1',
        assignment_type: 'LEAD_INSTRUCTOR',
        status
    });

    async function create(response: Observable<CourseAssignment[]>): Promise<void> {
        assignmentService.getMine.and.returnValue(response);
        fixture = TestBed.createComponent(MyCoursesPage);
        component = fixture.componentInstance;
        spyOn(fixture.debugElement.injector.get(MessageService), 'add');
        fixture.detectChanges();
        await fixture.whenStable();
    }

    beforeEach(async () => {
        assignmentService = jasmine.createSpyObj<CourseAssignmentService>('CourseAssignmentService', ['getMine']);

        await TestBed.configureTestingModule({
            imports: [MyCoursesPage],
            providers: [provideRouter([]), DetailNavigationService, { provide: CourseAssignmentService, useValue: assignmentService }]
        }).compileComponents();

        router = TestBed.inject(Router);
        spyOn(router, 'navigate');
    });

    it('liste les cours actifs du professeur connecté, triés par code', async () => {
        await create(of([assignment('2', 'RES-201'), assignment('1', 'ALG-101'), assignment('3', 'OLD-001', 'INACTIVE')]));

        expect(assignmentService.getMine).toHaveBeenCalled();
        expect(component.rows().map((row) => row.code)).toEqual(['ALG-101', 'RES-201']);
        expect(component.rows()[0].name).toBe('Cours ALG-101');
        expect(component.typeLabel('LEAD_INSTRUCTOR')).toBe('Titulaire');
        expect(TestBed.inject(DetailNavigationService).getContext('academic.courses')?.items.map((item) => item.id)).toEqual(['c-1', 'c-2']);
    });

    it('ouvre la fiche du cours', async () => {
        await create(of([assignment('1', 'ALG-101')]));
        component.openDetail(component.rows()[0]);
        expect(router.navigate).toHaveBeenCalledWith(['/academic/courses', 'c-1']);
    });

    it('signale l’échec du chargement', async () => {
        await create(throwError(() => new HttpErrorResponse({ status: 403, error: { detail: 'Accès refusé.' } })));
        expect(component.loading()).toBeFalse();
        expect(fixture.debugElement.injector.get(MessageService).add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', detail: 'Accès refusé.' }));
    });
});
