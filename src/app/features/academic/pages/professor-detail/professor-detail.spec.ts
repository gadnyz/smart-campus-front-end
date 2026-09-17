import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, provideRouter, Router, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { AuthService } from '@/app/core/auth/services/auth.service';
import { DetailNavigationService } from '@/app/shared/navigation/detail-navigation.service';
import { AcademicYear } from '../../models/academic-year.model';
import { Course } from '../../models/course.model';
import { CourseAssignment } from '../../models/course-assignment.model';
import { Professor } from '../../models/professor.model';
import { AcademicYearService } from '../../services/academic-year.service';
import { CourseAssignmentService } from '../../services/course-assignment.service';
import { CourseService } from '../../services/course.service';
import { FacultyService } from '../../services/faculty.service';
import { ProfessorGradeService } from '../../services/professor-grade.service';
import { ProfessorService } from '../../services/professor.service';
import { ProfessorDetailPage } from './professor-detail';

describe('ProfessorDetailPage', () => {
    let component: ProfessorDetailPage;
    let fixture: ComponentFixture<ProfessorDetailPage>;
    let professorService: jasmine.SpyObj<ProfessorService>;
    let assignmentService: jasmine.SpyObj<CourseAssignmentService>;
    let courseService: jasmine.SpyObj<CourseService>;
    let router: Router;
    const paramMap$ = new BehaviorSubject(convertToParamMap({ id: 'p-1' }));

    const professor: Professor = {
        id: 'p-1',
        first_name: 'Jean',
        last_name: 'Mbuyi',
        email: 'jean@unh.edu',
        faculty_id: 'fac-1',
        faculty_name: 'Sciences',
        professor_grade_id: 'g-1',
        professor_grade_name: 'Professeur',
        birth_date: '1980-05-15',
        birth_place: 'Kinshasa',
        gender: 'MALE',
        marital_status: 'MARRIED',
        nationality: 'Congolaise',
        phone: '+243840000001'
    };
    const year: AcademicYear = {
        id: 'year-1',
        label: '2026-2027',
        start_date: '2026-09-01',
        end_date: '2027-08-31',
        status: 'ACTIVE'
    };
    const assignment: CourseAssignment = {
        id: 'as-1',
        course_id: 'c-1',
        professor_id: 'p-1',
        academic_year_id: 'year-1',
        assignment_type: 'LEAD_INSTRUCTOR',
        status: 'ACTIVE',
        course_code: 'ALG-101',
        course_name: 'Algorithmique'
    };
    const course: Course = {
        id: 'c-2',
        code: 'DB-201',
        name: 'Bases de données',
        description: 'SQL',
        credits: 4,
        course_unit_id: 'u-1'
    };

    beforeEach(async () => {
        professorService = jasmine.createSpyObj<ProfessorService>('ProfessorService', [
            'getById',
            'getAll',
            'update',
            'delete'
        ]);
        assignmentService = jasmine.createSpyObj<CourseAssignmentService>('CourseAssignmentService', [
            'getByProfessor',
            'create',
            'update'
        ]);
        courseService = jasmine.createSpyObj<CourseService>('CourseService', ['getAll']);
        const gradeService = jasmine.createSpyObj<ProfessorGradeService>('ProfessorGradeService', ['getAll']);
        const facultyService = jasmine.createSpyObj<FacultyService>('FacultyService', ['getAll']);
        const yearService = jasmine.createSpyObj<AcademicYearService>('AcademicYearService', ['getCurrent']);

        professorService.getById.and.returnValue(of(professor));
        professorService.getAll.and.returnValue(of([professor]));
        assignmentService.getByProfessor.and.returnValue(of([assignment]));
        courseService.getAll.and.returnValue(of([course]));
        gradeService.getAll.and.returnValue(of([{ id: 'g-1', code: 'PROF', name: 'Professeur' }]));
        facultyService.getAll.and.returnValue(of([{ id: 'fac-1', code: 'FST', name: 'Sciences' }]));
        yearService.getCurrent.and.returnValue(of(year));

        await TestBed.configureTestingModule({
            imports: [ProfessorDetailPage],
            providers: [
                provideRouter([]),
                DetailNavigationService,
                { provide: ProfessorService, useValue: professorService },
                { provide: CourseAssignmentService, useValue: assignmentService },
                { provide: CourseService, useValue: courseService },
                { provide: ProfessorGradeService, useValue: gradeService },
                { provide: FacultyService, useValue: facultyService },
                { provide: AcademicYearService, useValue: yearService },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: paramMap$.asObservable(),
                        snapshot: { data: {}, paramMap: convertToParamMap({ id: 'p-1' }) }
                    }
                },
                {
                    provide: AuthService,
                    useValue: {
                        getCurrentUser: () => ({
                            id: 'admin',
                            authorities: [
                                'academic:professor:update:all',
                                'academic:professor:delete:all',
                                'academic:course-assignment:create:all'
                            ]
                        })
                    }
                }
            ]
        }).compileComponents();

        router = TestBed.inject(Router);
        spyOn(router, 'navigate');
        TestBed.inject(DetailNavigationService).setContext({
            scope: 'academic.professors',
            listRoute: ['/academic/professors'],
            page: 0,
            size: 1,
            totalElements: 1,
            totalPages: 1,
            items: [{ id: 'p-1', label: 'Mbuyi Jean' }]
        });
        fixture = TestBed.createComponent(ProfessorDetailPage);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
    });

    it('should load the professor and assigned courses', () => {
        expect(component.professor()?.id).toBe('p-1');
        expect(component.assignments().length).toBe(1);
        expect(component.courseLabel(assignment)).toContain('Algorithmique');
    });

    it('should open the assignment dialog for a new course', () => {
        component.openAssign();
        expect(component.assignmentDialogVisible()).toBeTrue();
        expect(component.courseOptions().some((option) => option.value === 'c-2')).toBeTrue();
    });

    it('should assign a course to the professor', () => {
        assignmentService.create.and.returnValue(of({ ...assignment, id: 'as-2', course_id: 'c-2' }));
        component.openAssign();
        component.assignmentForm.patchValue({
            course_id: 'c-2',
            academic_year_id: 'year-1',
            assignment_type: 'CO_INSTRUCTOR'
        });
        component.submitAssignment();
        expect(assignmentService.create).toHaveBeenCalled();
    });

    it('should allow editing without filling optional empty fields', () => {
        professorService.update.and.returnValue(of({ ...professor, professor_grade_id: 'g-1', faculty_id: 'fac-1' }));
        component.openEdit();
        component.professorForm.patchValue({
            faculty_id: 'fac-1',
            professor_grade_id: 'g-1',
            last_name: 'Mbuyi',
            first_name: 'Jean',
            gender: 'MALE',
            birth_date: null,
            birth_place: '',
            marital_status: null,
            nationality: '',
            phone: '',
            email: '',
            matricule: 'ENS-001'
        });
        expect(component.professorForm.valid).toBeTrue();
        component.submitProfessor();
        expect(professorService.update).toHaveBeenCalled();
        expect(professorService.getById).toHaveBeenCalledTimes(2);
    });

    it('should navigate to the assigned course', () => {
        component.openCourse(assignment);
        expect(router.navigate).toHaveBeenCalledWith(['/academic/courses', 'c-1']);
    });
});
