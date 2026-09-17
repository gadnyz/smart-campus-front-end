import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, provideRouter, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '@/app/core/auth/services/auth.service';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { DetailNavigationService } from '@/app/shared/navigation/detail-navigation.service';
import { AcademicYear } from '../../models/academic-year.model';
import { Course } from '../../models/course.model';
import { Student } from '../../models/student.model';
import { AcademicYearService } from '../../services/academic-year.service';
import { CourseAssignmentService } from '../../services/course-assignment.service';
import { CourseService } from '../../services/course.service';
import { CourseUnitService } from '../../services/course-unit.service';
import { FacultyService } from '../../services/faculty.service';
import { ProfessorService } from '../../services/professor.service';
import { StudentService } from '../../services/student.service';
import { CourseDetailPage } from './course-detail';

describe('CourseDetailPage students and collaborators', () => {
    let component: CourseDetailPage;
    let fixture: ComponentFixture<CourseDetailPage>;
    let studentService: jasmine.SpyObj<StudentService>;
    const paramMap$ = new BehaviorSubject(convertToParamMap({ id: 'c-1' }));
    const course: Course = {
        id: 'c-1',
        code: 'ALG-101',
        name: 'Algorithmique',
        description: 'Algo',
        credits: 5,
        course_unit_id: 'u-1'
    };
    const year: AcademicYear = {
        id: 'year-1',
        label: '2026-2027',
        start_date: '2026-09-01',
        end_date: '2027-08-31',
        status: 'ACTIVE'
    };
    const students: Student[] = [
        {
            id: 'st-1',
            first_name: 'Ada',
            last_name: 'Lovelace',
            matricule: 'FST-001',
            program_name: 'Génie Logiciel',
            level_code: 'L1'
        }
    ];

    beforeEach(async () => {
        studentService = jasmine.createSpyObj<StudentService>('StudentService', ['getByCourse']);
        const courseService = jasmine.createSpyObj<CourseService>('CourseService', ['findById']);
        const assignmentService = jasmine.createSpyObj<CourseAssignmentService>('CourseAssignmentService', [
            'getByCourse'
        ]);
        const unitService = jasmine.createSpyObj<CourseUnitService>('CourseUnitService', ['getById']);
        const yearService = jasmine.createSpyObj<AcademicYearService>('AcademicYearService', ['getCurrent']);
        const permissionService = jasmine.createSpyObj<PermissionService>('PermissionService', [
            'hasAnyPermission',
            'canAccess'
        ]);

        studentService.getByCourse.and.returnValue(of(students));
        courseService.findById.and.returnValue(of(course));
        assignmentService.getByCourse.and.returnValue(of([]));
        unitService.getById.and.returnValue(
            of({
                id: 'u-1',
                code: 'FST-DEV',
                knowledge_skills_bloc: 'DEVELOPMENT',
                program_level_id: 'pl-1'
            })
        );
        yearService.getCurrent.and.returnValue(of(year));
        permissionService.hasAnyPermission.and.returnValue(true);
        permissionService.canAccess.and.returnValue(true);

        await TestBed.configureTestingModule({
            imports: [CourseDetailPage],
            providers: [
                provideRouter([]),
                DetailNavigationService,
                { provide: StudentService, useValue: studentService },
                { provide: CourseService, useValue: courseService },
                { provide: CourseAssignmentService, useValue: assignmentService },
                { provide: CourseUnitService, useValue: unitService },
                { provide: AcademicYearService, useValue: yearService },
                { provide: ProfessorService, useValue: jasmine.createSpyObj('ProfessorService', ['getByFaculty', 'getAll']) },
                { provide: FacultyService, useValue: jasmine.createSpyObj('FacultyService', ['resolveAttachedFaculty']) },
                { provide: PermissionService, useValue: permissionService },
                {
                    provide: ActivatedRoute,
                    useValue: { paramMap: paramMap$.asObservable() }
                },
                {
                    provide: AuthService,
                    useValue: { getCurrentUser: () => ({ id: 'admin', authorities: [] }) }
                }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(CourseDetailPage);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
    });

    it('should load enrolled students for the course', () => {
        expect(studentService.getByCourse).toHaveBeenCalledWith('c-1');
        expect(component.students().length).toBe(1);
        expect(component.studentName(students[0])).toBe('Lovelace Ada');
        expect(component.studentProgram(students[0])).toBe('Génie Logiciel');
        expect(component.studentLevel(students[0])).toBe('L1');
    });

    it('should ignore a missing students endpoint', async () => {
        studentService.getByCourse.and.returnValue(
            throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not Found' }))
        );
        fixture = TestBed.createComponent(CourseDetailPage);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
        expect(component.students()).toEqual([]);
    });
});
