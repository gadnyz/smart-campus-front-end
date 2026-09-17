import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/services/auth.service';
import { DetailNavigationService } from '@/app/shared/navigation/detail-navigation.service';
import { Student } from '../../models/student.model';
import { AcademicCatalogService } from '../../services/academic-catalog.service';
import { StudentService } from '../../services/student.service';
import { StudentListPage } from './student-list';

describe('StudentListPage', () => {
    let component: StudentListPage;
    let fixture: ComponentFixture<StudentListPage>;
    let studentService: jasmine.SpyObj<StudentService>;
    let catalog: jasmine.SpyObj<AcademicCatalogService>;
    let router: Router;

    const students: Student[] = [
        {
            id: 'st-1',
            first_name: 'Ada',
            last_name: 'Lovelace',
            gender: 'FEMALE',
            nationality: 'Congolaise',
            email: 'ada@unh.edu',
            matricule: 'FST-001',
            faculty_id: 'fac-info',
            faculty_name: 'Sciences informatiques',
            program_name: 'Génie Logiciel',
            level_code: 'L1'
        },
        {
            id: 'st-2',
            first_name: 'John',
            last_name: 'Banda',
            gender: 'MALE',
            nationality: 'Zambienne',
            email: 'john@unh.edu',
            matricule: 'FST-002',
            faculty_id: 'fac-info',
            faculty_name: 'Sciences informatiques',
            program_name: 'Génie Logiciel',
            level_code: 'L1'
        }
    ];

    beforeEach(async () => {
        studentService = jasmine.createSpyObj<StudentService>('StudentService', ['getAll']);
        catalog = jasmine.createSpyObj<AcademicCatalogService>('AcademicCatalogService', [
            'getFaculties',
            'getLevels',
            'getPrograms',
            'getProgramsByFaculty'
        ]);
        studentService.getAll.and.returnValue(
            of({
                content: students,
                page: 0,
                size: 10,
                total_elements: 2,
                total_pages: 1
            })
        );
        catalog.getFaculties.and.returnValue(of([{ id: 'fac-info', code: 'FSI', name: 'Sciences informatiques' }]));
        catalog.getLevels.and.returnValue(of([{ id: 'lvl-1', code: 'L1', name: 'Licence 1' }]));
        catalog.getPrograms.and.returnValue(
            of([{ id: 'pr-1', code: 'GL', name: 'Génie Logiciel', faculty_id: 'fac-info' }])
        );
        catalog.getProgramsByFaculty.and.returnValue(
            of([{ id: 'pr-1', code: 'GL', name: 'Génie Logiciel', faculty_id: 'fac-info' }])
        );

        await TestBed.configureTestingModule({
            imports: [StudentListPage],
            providers: [
                provideRouter([]),
                DetailNavigationService,
                { provide: StudentService, useValue: studentService },
                { provide: AcademicCatalogService, useValue: catalog },
                {
                    provide: AuthService,
                    useValue: {
                        getCurrentUser: () => ({
                            id: 'admin',
                            authorities: ['academic:student:read:all']
                        })
                    }
                }
            ]
        }).compileComponents();

        router = TestBed.inject(Router);
        spyOn(router, 'navigate');
        fixture = TestBed.createComponent(StudentListPage);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
    });

    it('should load students without validate or reject actions', () => {
        expect(component.students().map((student) => student.id)).toEqual(['st-1', 'st-2']);
        expect(component.totalElements()).toBe(2);
        expect(component.actions().some((action) => /valider|rejeter/i.test(action.label))).toBeFalse();
    });

    it('should navigate to the student detail', () => {
        component.openDetail(students[1]);
        expect(router.navigate).toHaveBeenCalledWith(['/academic/students', 'st-2']);
    });

    it('should keep male computer-science students after advanced search', () => {
        studentService.getAll.calls.reset();
        component.advancedOpen.set(true);
        component.genderFilter.set('MALE');
        component.onFacultyChange('fac-info');

        expect(studentService.getAll).toHaveBeenCalledWith(
            jasmine.objectContaining({
                page: 0,
                gender: 'MALE',
                facultyId: 'fac-info'
            })
        );
        expect(component.students().map((student) => student.id)).toEqual(['st-2']);
        expect(catalog.getProgramsByFaculty).toHaveBeenCalledWith('fac-info');
    });

    it('should keep Zambian students when filtering by nationality', () => {
        component.nationalityFilter.set('zambienne');
        component.applySearch(0);
        expect(component.students().map((student) => student.nationality)).toEqual(['Zambienne']);
    });

    it('should show an empty list when the students endpoint fails', async () => {
        studentService.getAll.and.returnValue(throwError(() => ({ error: { detail: 'boom' } })));
        fixture = TestBed.createComponent(StudentListPage);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
        expect(component.students()).toEqual([]);
        expect(component.totalElements()).toBe(0);
    });
});
