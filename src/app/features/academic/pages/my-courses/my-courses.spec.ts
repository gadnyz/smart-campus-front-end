import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/services/auth.service';
import { DetailNavigationService } from '@/app/shared/navigation/detail-navigation.service';
import { Course } from '../../models/course.model';
import { CourseAssignment } from '../../models/course-assignment.model';
import { Professor } from '../../models/professor.model';
import { CourseAssignmentService } from '../../services/course-assignment.service';
import { CourseService } from '../../services/course.service';
import { ProfessorService } from '../../services/professor.service';
import { MyCoursesPage } from './my-courses';

describe('MyCoursesPage', () => {
    let component: MyCoursesPage;
    let fixture: ComponentFixture<MyCoursesPage>;
    let professorService: jasmine.SpyObj<ProfessorService>;
    let assignmentService: jasmine.SpyObj<CourseAssignmentService>;
    let courseService: jasmine.SpyObj<CourseService>;
    let router: Router;

    const professor: Professor = {
        id: 'p-1',
        first_name: 'Jean',
        last_name: 'Mbuyi',
        faculty_id: 'fac-1',
        email: 'jean@unh.edu',
        user_id: 'user-1'
    };
    const assignment: CourseAssignment = {
        id: 'as-1',
        course_id: 'c-1',
        professor_id: 'p-1',
        academic_year_id: 'year-1',
        assignment_type: 'LEAD_INSTRUCTOR',
        status: 'ACTIVE'
    };
    const course: Course = {
        id: 'c-1',
        code: 'ALG-101',
        name: 'Algorithmique',
        description: 'Algo',
        credits: 5,
        course_unit_id: 'u-1'
    };

    beforeEach(async () => {
        professorService = jasmine.createSpyObj<ProfessorService>('ProfessorService', ['resolveCurrent']);
        assignmentService = jasmine.createSpyObj<CourseAssignmentService>('CourseAssignmentService', [
            'getByProfessor'
        ]);
        courseService = jasmine.createSpyObj<CourseService>('CourseService', ['getAll']);
        professorService.resolveCurrent.and.returnValue(of(professor));
        assignmentService.getByProfessor.and.returnValue(of([assignment]));
        courseService.getAll.and.returnValue(of([course]));

        await TestBed.configureTestingModule({
            imports: [MyCoursesPage],
            providers: [
                provideRouter([]),
                DetailNavigationService,
                { provide: ProfessorService, useValue: professorService },
                { provide: CourseAssignmentService, useValue: assignmentService },
                { provide: CourseService, useValue: courseService },
                {
                    provide: AuthService,
                    useValue: {
                        getCurrentUser: () => ({ id: 'user-1', email: 'jean@unh.edu', authorities: [] })
                    }
                }
            ]
        }).compileComponents();

        router = TestBed.inject(Router);
        spyOn(router, 'navigate');
        fixture = TestBed.createComponent(MyCoursesPage);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
    });

    it('should list assigned courses for the connected professor', () => {
        expect(professorService.resolveCurrent).toHaveBeenCalledWith('user-1', 'jean@unh.edu');
        expect(component.rows().length).toBe(1);
        expect(component.rows()[0].code).toBe('ALG-101');
        expect(component.typeLabel('LEAD_INSTRUCTOR')).toBe('Titulaire');
    });

    it('should open the course detail', () => {
        component.openDetail(component.rows()[0]);
        expect(router.navigate).toHaveBeenCalledWith(['/academic/courses', 'c-1']);
    });
});
