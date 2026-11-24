import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/services/auth.service';
import { DetailNavigationService } from '@/app/shared/navigation/detail-navigation.service';
import { Student } from '../../models/student.model';
import { AcademicCatalogService } from '../../services/academic-catalog.service';
import { StudentService } from '../../services/student.service';
import { EXPORT_SERVICE, ExportService } from '@/app/shared/export/export.service';
import { TableExportDocument } from '@/app/shared/export/export-document.model';
import { StudentListPage } from './student-list';

describe('StudentListPage', () => {
    let component: StudentListPage;
    let fixture: ComponentFixture<StudentListPage>;
    let studentService: jasmine.SpyObj<StudentService>;
    let catalog: jasmine.SpyObj<AcademicCatalogService>;
    let router: Router;
    let exporter: jasmine.SpyObj<ExportService>;

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
            of([
                {
                    id: 'pr-1',
                    code: 'GL',
                    name: 'Génie Logiciel',
                    faculty_id: 'fac-info',
                    levels: [{ id: 'pl-1', is_common: false, level: { id: 'lvl-1', code: 'L1', name: 'Licence 1' } }]
                }
            ])
        );

        await TestBed.configureTestingModule({
            imports: [StudentListPage],
            providers: [
                provideRouter([]),
                DetailNavigationService,
                { provide: StudentService, useValue: studentService },
                { provide: AcademicCatalogService, useValue: catalog },
                { provide: EXPORT_SERVICE, useFactory: () => (exporter = jasmine.createSpyObj<ExportService>('ExportService', ['print', 'downloadPdf', 'downloadExcel'])) },
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

    it('should load the students of the scope at once', () => {
        expect(component.students().map((student) => student.id)).toEqual(['st-1', 'st-2']);
        expect(studentService.getAll).toHaveBeenCalledWith(jasmine.objectContaining({ page: 0, size: 1000, search: null }));
        expect(component.truncated()).toBeFalse();
    });

    it('should search by name or promotion, then filter and sort in the browser', () => {
        component.query.set({ search: 'l1 genie', filters: [], sort: null });
        expect(component.visibleStudents().length).toBe(2);

        component.query.set({ search: '', filters: [{ key: 'gender', operator: 'in', values: ['Masculin'] }], sort: null });
        expect(component.visibleStudents().map((student) => student.id)).toEqual(['st-2']);

        component.query.set({ search: '', filters: [], sort: { key: 'name', direction: 'asc' } });
        expect(component.visibleStudents().map((student) => student.id)).toEqual(['st-2', 'st-1']);
    });

    it('should export exactly the filtered rows, with the active filters', async () => {
        exporter.downloadExcel.and.resolveTo();
        component.query.set({ search: 'banda', filters: [], sort: null });
        fixture.detectChanges();

        (fixture.nativeElement.querySelector('[aria-label="Exporter la liste en Excel"]') as HTMLElement).click();

        const document = exporter.downloadExcel.calls.mostRecent().args[0] as TableExportDocument;
        expect(document.rows.length).toBe(1);
        expect(document.rows[0]).toContain('FST-002');
        expect(document.filters).toEqual(['Recherche : « banda »']);
    });

    it('should navigate to the student detail', () => {
        component.openDetail(students[1]);
        expect(router.navigate).toHaveBeenCalledWith(['/academic/students', 'st-2']);
    });

    it('should filter by faculty and promotion through the API, and say when not everything is loaded', () => {
        studentService.getAll.calls.reset();
        studentService.getAll.and.returnValue(of({ content: [students[1]], page: 0, size: 10, total_elements: 37, total_pages: 4 }));
        component.onFacultyChange('fac-info');
        component.onProgramChange('pr-1');

        expect(component.programLevels()).toEqual([{ label: 'L1', value: 'pl-1' }]);
        component.onProgramLevelChange('pl-1');

        expect(studentService.getAll).toHaveBeenCalledWith(
            jasmine.objectContaining({ page: 0, facultyId: 'fac-info', programId: 'pr-1', programLevelId: 'pl-1' })
        );
        expect(catalog.getProgramsByFaculty).toHaveBeenCalledWith('fac-info');
        expect(component.students().map((student) => student.id)).toEqual(['st-2']);
        expect(component.totalElements()).toBe(37);
        expect(component.truncated()).toBeTrue();
    });

    it('should clear the promotion when the program changes', () => {
        component.onFacultyChange('fac-info');
        component.onProgramChange('pr-1');
        component.onProgramLevelChange('pl-1');
        component.onProgramChange(null);

        expect(component.programLevelFilter()).toBeNull();
        expect(component.programLevels()).toEqual([]);
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
