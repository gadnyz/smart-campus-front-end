import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/services/auth.service';
import { DetailNavigationService } from '@/app/shared/navigation/detail-navigation.service';
import { Faculty } from '../../models/faculty.model';
import { Professor } from '../../models/professor.model';
import { ProfessorGrade } from '../../models/professor-grade.model';
import { FacultyService } from '../../services/faculty.service';
import { ProfessorGradeService } from '../../services/professor-grade.service';
import { ProfessorService } from '../../services/professor.service';
import { ProfessorListPage } from './professor-list';

describe('ProfessorListPage', () => {
    let component: ProfessorListPage;
    let fixture: ComponentFixture<ProfessorListPage>;
    let professorService: jasmine.SpyObj<ProfessorService>;
    let gradeService: jasmine.SpyObj<ProfessorGradeService>;
    let facultyService: jasmine.SpyObj<FacultyService>;
    let router: Router;

    const grades: ProfessorGrade[] = [
        { id: 'g-prof', code: 'PROF', name: 'Professeur' },
        { id: 'g-ct', code: 'CT', name: 'Chef de travaux' }
    ];
    const faculties: Faculty[] = [{ id: 'fac-1', code: 'FST', name: 'Sciences' }];
    const professors: Professor[] = [
        {
            id: 'p-2',
            first_name: 'Claire',
            last_name: 'Kalala',
            email: 'claire@unh.edu',
            faculty_id: 'fac-1',
            professor_grade_id: 'g-ct'
        },
        {
            id: 'p-1',
            first_name: 'Jean',
            last_name: 'Mbuyi',
            email: 'jean@unh.edu',
            faculty_id: 'fac-1',
            professor_grade_id: 'g-prof'
        }
    ];

    beforeEach(async () => {
        professorService = jasmine.createSpyObj<ProfessorService>('ProfessorService', ['getAll', 'create']);
        gradeService = jasmine.createSpyObj<ProfessorGradeService>('ProfessorGradeService', ['getAll']);
        facultyService = jasmine.createSpyObj<FacultyService>('FacultyService', ['getAll']);
        professorService.getAll.and.returnValue(of(professors));
        gradeService.getAll.and.returnValue(of(grades));
        facultyService.getAll.and.returnValue(of(faculties));

        await TestBed.configureTestingModule({
            imports: [ProfessorListPage],
            providers: [
                provideRouter([]),
                DetailNavigationService,
                { provide: ProfessorService, useValue: professorService },
                { provide: ProfessorGradeService, useValue: gradeService },
                { provide: FacultyService, useValue: facultyService },
                {
                    provide: AuthService,
                    useValue: {
                        getCurrentUser: () => ({
                            id: 'admin',
                            email: 'admin@unh.edu',
                            authorities: ['academic:professor:create:all']
                        })
                    }
                }
            ]
        }).compileComponents();

        router = TestBed.inject(Router);
        spyOn(router, 'navigate');
        fixture = TestBed.createComponent(ProfessorListPage);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
    });

    it('should group professors by grade', () => {
        expect(component.rows().map((row) => row.grade_label)).toEqual(['Chef de travaux', 'Professeur']);
        expect(component.rows()[0].display_name).toContain('Kalala');
    });

    it('should list only academic professors', () => {
        expect(component.professors().map((professor) => professor.email)).toEqual([
            'claire@unh.edu',
            'jean@unh.edu'
        ]);
    });

    it('should navigate to the professor detail', () => {
        component.openDetail(component.rows()[0]);
        expect(router.navigate).toHaveBeenCalledWith(['/academic/professors', 'p-2']);
    });

    it('should create a professor', () => {
        professorService.create.and.returnValue(of(professors[1]));
        component.openCreateDialog();
        component.form.patchValue({
            faculty_id: 'fac-1',
            professor_grade_id: 'g-prof',
            first_name: 'Jean',
            last_name: 'Mbuyi',
            email: 'jean@unh.edu'
        });
        component.submit();

        expect(professorService.create).toHaveBeenCalled();
        expect(professorService.getAll).toHaveBeenCalledTimes(2);
    });

    it('should show an error when the catalog fails to load', async () => {
        professorService.getAll.and.returnValue(throwError(() => ({ error: { detail: 'boom' } })));
        fixture = TestBed.createComponent(ProfessorListPage);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
        expect(component.professors()).toEqual([]);
    });
});
