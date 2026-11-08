import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, provideRouter, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { AuthService } from '@/app/core/auth/services/auth.service';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { DetailNavigationService } from '@/app/shared/navigation/detail-navigation.service';
import { AcademicYear } from '../../models/academic-year.model';
import { Course } from '../../models/course.model';
import { AcademicYearService } from '../../services/academic-year.service';
import { CourseAssignmentService } from '../../services/course-assignment.service';
import { CourseService } from '../../services/course.service';
import { CourseUnitService } from '../../services/course-unit.service';
import { FacultyService } from '../../services/faculty.service';
import { ProfessorService } from '../../services/professor.service';
import { CourseDetailPage } from './course-detail';

describe('CourseDetailPage', () => {
    let component: CourseDetailPage;
    let fixture: ComponentFixture<CourseDetailPage>;
    let courseService: jasmine.SpyObj<CourseService>;
    let unitService: jasmine.SpyObj<CourseUnitService>;
    const paramMap$ = new BehaviorSubject(convertToParamMap({ id: 'c-1' }));
    const course: Course = { id: 'c-1', code: 'ALG-101', name: 'Algorithmique', description: 'Algo', credits: 5, faculty_id: 'fac-1' };
    const year: AcademicYear = { id: 'year-1', label: '2026-2027', start_date: '2026-09-01', end_date: '2027-08-31', status: 'ACTIVE' };

    async function create(programLevelId: string | null): Promise<void> {
        const navigation = TestBed.inject(DetailNavigationService);
        navigation.setContext({
            scope: 'academic.courses',
            listRoute: ['/academic/courses'],
            page: 0,
            size: 1,
            totalElements: 1,
            totalPages: 1,
            items: [{ id: 'c-1', label: 'Algorithmique' }],
            filters: { programLevelId }
        });
        fixture = TestBed.createComponent(CourseDetailPage);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
    }

    beforeEach(async () => {
        sessionStorage.removeItem('smartcampus.detail-navigation');
        courseService = jasmine.createSpyObj<CourseService>('CourseService', ['findById', 'update']);
        unitService = jasmine.createSpyObj<CourseUnitService>('CourseUnitService', ['getByProgramLevel', 'getCourses']);
        const assignmentService = jasmine.createSpyObj<CourseAssignmentService>('CourseAssignmentService', ['getByCourse']);
        const yearService = jasmine.createSpyObj<AcademicYearService>('AcademicYearService', ['getCurrent']);
        const permissionService = jasmine.createSpyObj<PermissionService>('PermissionService', ['hasAnyPermission', 'canAccess', 'canWrite']);

        courseService.findById.and.returnValue(of(course));
        courseService.update.and.returnValue(of(course));
        assignmentService.getByCourse.and.returnValue(of([]));
        unitService.getByProgramLevel.and.returnValue(
            of([
                { id: 'u-1', code: 'FST-DEV', knowledge_skills_bloc: 'DEVELOPMENT', program_level_id: 'pl-1' },
                { id: 'u-2', code: 'FST-FON', knowledge_skills_bloc: 'FONDAMENTAL', program_level_id: 'pl-1' }
            ])
        );
        unitService.getCourses.and.callFake((unitId: string) =>
            of(unitId === 'u-1' ? [{ course_id: 'c-1', code: 'ALG-101', name: 'Algorithmique', credits: 3 }] : [])
        );
        yearService.getCurrent.and.returnValue(of(year));
        permissionService.hasAnyPermission.and.returnValue(true);
        permissionService.canAccess.and.returnValue(true);
        permissionService.canWrite.and.returnValue(true);

        await TestBed.configureTestingModule({
            imports: [CourseDetailPage],
            providers: [
                provideRouter([]),
                DetailNavigationService,
                { provide: CourseService, useValue: courseService },
                { provide: CourseAssignmentService, useValue: assignmentService },
                { provide: CourseUnitService, useValue: unitService },
                { provide: AcademicYearService, useValue: yearService },
                { provide: ProfessorService, useValue: jasmine.createSpyObj('ProfessorService', ['getByFaculty', 'getAll']) },
                { provide: FacultyService, useValue: jasmine.createSpyObj('FacultyService', ['resolveAttachedFaculty']) },
                { provide: PermissionService, useValue: permissionService },
                { provide: ActivatedRoute, useValue: { paramMap: paramMap$.asObservable() } },
                { provide: AuthService, useValue: { getCurrentUser: () => ({ id: 'admin', authorities: [] }) } }
            ]
        }).compileComponents();
    });

    it('should list the UE of the promotion that contain the course, with their credits in it', async () => {
        await create('pl-1');

        expect(component.course()?.id).toBe('c-1');
        expect(unitService.getByProgramLevel).toHaveBeenCalledWith('pl-1');
        expect(component.courseUnits().map((item) => [item.unit.code, item.credits])).toEqual([['FST-DEV', 3]]);
    });

    it('should not guess the UE without a promotion to start from', async () => {
        await create(null);

        expect(unitService.getByProgramLevel).not.toHaveBeenCalled();
        expect(component.courseUnits()).toEqual([]);
    });

    it('should no longer show an enrolled students panel', async () => {
        await create('pl-1');
        expect((fixture.nativeElement as HTMLElement).querySelector('app-course-enrolled-students')).toBeNull();
    });

    it('should update the course without any course unit, managed from the UE', async () => {
        await create('pl-1');
        component.openEditCourse();
        component.courseForm.patchValue({ name: 'Algorithmique avancée' });
        component.submitCourse();

        expect(courseService.update).toHaveBeenCalledOnceWith('c-1', { code: 'ALG-101', name: 'Algorithmique avancée', description: 'Algo', credits: 5 });
    });
});
