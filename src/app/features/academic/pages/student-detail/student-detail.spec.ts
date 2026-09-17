import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, provideRouter, Router, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { AuthService } from '@/app/core/auth/services/auth.service';
import { DetailNavigationService } from '@/app/shared/navigation/detail-navigation.service';
import { Student } from '../../models/student.model';
import { AcademicCatalogService } from '../../services/academic-catalog.service';
import { StudentService } from '../../services/student.service';
import { StudentDetailPage } from './student-detail';

describe('StudentDetailPage', () => {
    let component: StudentDetailPage;
    let fixture: ComponentFixture<StudentDetailPage>;
    let studentService: jasmine.SpyObj<StudentService>;
    let router: Router;
    const paramMap$ = new BehaviorSubject(convertToParamMap({ id: 'st-1' }));

    const student: Student = {
        id: 'st-1',
        first_name: 'Ada',
        last_name: 'Lovelace',
        middle_name: 'Byron',
        gender: 'FEMALE',
        birth_date: '2000-01-01',
        birth_place: 'Kinshasa',
        marital_status: 'SINGLE',
        nationality: 'Congolaise',
        email: 'ada@unh.edu',
        phone: '+243810000001',
        matricule: 'FST-001',
        faculty_id: 'fac-1',
        faculty_name: 'Sciences informatiques',
        program_id: 'pr-1',
        program_name: 'Génie Logiciel',
        level_id: 'lvl-1',
        level_code: 'L1',
        academic_year_id: 'year-1',
        academic_year_label: '2026-2027',
        origin: { province: 'Kinshasa', territory: 'Gombe', sector: 'Centre', commune: 'Gombe' },
        tutor: { full_name: 'Tutor', email: 'tutor@unh.edu', phone: '+243810000002', profession: 'Engineer' },
        emergency_contact: {
            full_name: 'Emergency',
            email: 'emergency@unh.edu',
            phone: '+243810000003',
            relationship: 'Parent'
        },
        academic_background: {
            school_name: 'Lycée',
            option: 'Math',
            percentage: 75,
            graduation_year: 2018,
            study_country: 'CD',
            study_city: 'Kinshasa'
        }
    };

    beforeEach(async () => {
        studentService = jasmine.createSpyObj<StudentService>('StudentService', ['getById', 'update']);
        const catalog = jasmine.createSpyObj<AcademicCatalogService>('AcademicCatalogService', [
            'getFaculties',
            'getLevels',
            'getPrograms',
            'getProgramsByFaculty'
        ]);

        studentService.getById.and.returnValue(of(student));
        studentService.update.and.returnValue(of({ ...student, nationality: 'Zambienne' }));
        catalog.getFaculties.and.returnValue(of([{ id: 'fac-1', code: 'FSI', name: 'Sciences informatiques' }]));
        catalog.getLevels.and.returnValue(of([{ id: 'lvl-1', code: 'L1', name: 'Licence 1' }]));
        catalog.getPrograms.and.returnValue(
            of([{ id: 'pr-1', code: 'GL', name: 'Génie Logiciel', faculty_id: 'fac-1' }])
        );
        catalog.getProgramsByFaculty.and.returnValue(
            of([{ id: 'pr-1', code: 'GL', name: 'Génie Logiciel', faculty_id: 'fac-1' }])
        );

        await TestBed.configureTestingModule({
            imports: [StudentDetailPage],
            providers: [
                provideRouter([]),
                DetailNavigationService,
                { provide: StudentService, useValue: studentService },
                { provide: AcademicCatalogService, useValue: catalog },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: paramMap$.asObservable(),
                        snapshot: { data: {}, paramMap: convertToParamMap({ id: 'st-1' }) }
                    }
                },
                {
                    provide: AuthService,
                    useValue: {
                        getCurrentUser: () => ({
                            id: 'admin',
                            authorities: ['academic:student:read:all', 'academic:student:update:all']
                        })
                    }
                }
            ]
        }).compileComponents();

        router = TestBed.inject(Router);
        spyOn(router, 'navigate');
        TestBed.inject(DetailNavigationService).setContext({
            scope: 'academic.students',
            listRoute: ['/academic/students'],
            page: 0,
            size: 1,
            totalElements: 2,
            totalPages: 1,
            items: [
                { id: 'st-1', label: 'Lovelace Ada Byron' },
                { id: 'st-2', label: 'Banda John' }
            ]
        });
        fixture = TestBed.createComponent(StudentDetailPage);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
    });

    it('should load the student without validate or reject actions', () => {
        expect(component.student()?.id).toBe('st-1');
        expect(component.displayName()).toBe('Lovelace Ada Byron');
        expect(component.editing()).toBeFalse();
        expect(component.actions().map((action) => action.label)).toEqual(['Liste', 'Précédent', 'Suivant', 'Modifier']);
    });

    it('should switch the same fields to editable inputs then back after save', () => {
        component.startEdit();
        expect(component.editing()).toBeTrue();
        expect(component.actions().map((action) => action.label)).toEqual(['Annuler', 'Enregistrer']);

        component.form.patchValue({ nationality: 'Zambienne' });
        studentService.getById.and.returnValue(of({ ...student, nationality: 'Zambienne' }));
        component.save();

        expect(studentService.update).toHaveBeenCalledWith(
            'st-1',
            jasmine.objectContaining({
                nationality: 'Zambienne',
                faculty_id: 'fac-1',
                first_name: 'Ada',
                last_name: 'Lovelace'
            })
        );
        expect(studentService.getById).toHaveBeenCalledTimes(2);
        expect(component.editing()).toBeFalse();
        expect(component.student()?.nationality).toBe('Zambienne');
    });

    it('should restore the previous values when edit is cancelled', () => {
        component.startEdit();
        component.form.patchValue({ first_name: 'Changed' });
        component.cancelEdit();
        expect(component.editing()).toBeFalse();
        expect(component.form.controls.first_name.value).toBe('Ada');
    });

    it('should navigate to the next student in the list', () => {
        const next = component.actions().find((action) => action.label === 'Suivant');
        next?.command?.();
        expect(router.navigate).toHaveBeenCalledWith(['/academic/students', 'st-2']);
    });
});
