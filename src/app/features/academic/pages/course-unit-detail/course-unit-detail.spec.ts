import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Confirmation, ConfirmationService, MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { CourseUnitDetail } from '../../models/course-unit.model';
import { Program } from '../../models/program.model';
import { CourseService } from '../../services/course.service';
import { CourseUnitService } from '../../services/course-unit.service';
import { ProgramService } from '../../services/program.service';
import { CourseUnitDetailPage } from './course-unit-detail';

describe('CourseUnitDetailPage', () => {
    let component: CourseUnitDetailPage;
    let fixture: ComponentFixture<CourseUnitDetailPage>;
    let unitService: jasmine.SpyObj<CourseUnitService>;
    let courseService: jasmine.SpyObj<CourseService>;
    let permissionService: jasmine.SpyObj<PermissionService>;
    let confirmation: ConfirmationService;
    let messages: MessageService;

    const unit: CourseUnitDetail = {
        id: 'u-1',
        code: 'FST-FON',
        faculty_id: 'fac-1',
        curriculum: [{ program_level_id: 'pl-1', knowledge_skills_bloc: 'FONDAMENTAL' }]
    };
    const programs = [
        {
            id: 'p-1',
            name: 'Informatique',
            levels: [
                { id: 'pl-1', level: { code: 'L1' }, is_common: false },
                { id: 'pl-2', level: { code: 'L2' }, is_common: false }
            ]
        }
    ] as unknown as Program[];

    async function create(canWrite = true): Promise<void> {
        permissionService.canWrite.and.returnValue(canWrite);
        fixture = TestBed.createComponent(CourseUnitDetailPage);
        component = fixture.componentInstance;
        confirmation = fixture.debugElement.injector.get(ConfirmationService);
        messages = fixture.debugElement.injector.get(MessageService);
        spyOn(confirmation, 'confirm').and.callFake((options: Confirmation) => {
            options.accept?.();
            return confirmation;
        });
        spyOn(messages, 'add');
        fixture.detectChanges();
        await fixture.whenStable();
    }

    beforeEach(async () => {
        unitService = jasmine.createSpyObj<CourseUnitService>('CourseUnitService', [
            'getById',
            'getCourses',
            'getByProgramLevel',
            'addToCurriculum',
            'removeFromCurriculum',
            'changeBloc',
            'attachCourse',
            'detachCourse',
            'delete'
        ]);
        courseService = jasmine.createSpyObj<CourseService>('CourseService', ['getAll']);
        permissionService = jasmine.createSpyObj<PermissionService>('PermissionService', ['canWrite', 'hasAnyPermission', 'canAccess']);
        const programService = jasmine.createSpyObj<ProgramService>('ProgramService', ['getByFaculty']);

        unitService.getById.and.returnValue(of(structuredClone(unit)));
        unitService.getCourses.and.returnValue(of([{ course_id: 'c-1', code: 'ALG-101', name: 'Algorithmique', credits: 3 }]));
        courseService.getAll.and.returnValue(
            of([
                { id: 'c-1', code: 'ALG-101', name: 'Algorithmique', description: '', credits: 5 },
                { id: 'c-2', code: 'RES-201', name: 'Réseaux', description: '', credits: 4 }
            ])
        );
        programService.getByFaculty.and.returnValue(of(programs));
        permissionService.hasAnyPermission.and.returnValue(true);
        permissionService.canAccess.and.returnValue(true);

        await TestBed.configureTestingModule({
            imports: [CourseUnitDetailPage],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'u-1' }) } } },
                { provide: CourseUnitService, useValue: unitService },
                { provide: CourseService, useValue: courseService },
                { provide: ProgramService, useValue: programService },
                { provide: PermissionService, useValue: permissionService }
            ]
        }).compileComponents();
    });

    it('propose seulement les promotions où l’UE ne figure pas', async () => {
        await create();
        expect(component.curriculum()).toEqual([{ programLevelId: 'pl-1', label: 'Informatique — L1', bloc: 'FONDAMENTAL' }]);
        expect(component.enrollOptions()).toEqual([{ label: 'Informatique — L2', value: 'pl-2' }]);
    });

    it('inscrit l’UE dans une autre promotion avec son bloc', async () => {
        await create();
        unitService.addToCurriculum.and.returnValue(of({ program_level_id: 'pl-2', knowledge_skills_bloc: 'DEVELOPMENT' }));
        component.openEnroll();
        component.enrollForm.setValue({ program_level_id: 'pl-2', knowledge_skills_bloc: 'DEVELOPMENT' });
        component.submitEnroll();

        expect(unitService.addToCurriculum).toHaveBeenCalledWith('u-1', 'pl-2', 'DEVELOPMENT');
        expect(component.curriculum().map((row) => row.programLevelId)).toEqual(['pl-1', 'pl-2']);
        expect(component.enrollOptions()).toEqual([]);
        expect(component.enrollDialogVisible()).toBeFalse();
    });

    it('change le bloc d’une promotion, et le rétablit si le serveur refuse', async () => {
        await create();
        const row = component.curriculum()[0];
        unitService.changeBloc.and.returnValue(of({ program_level_id: 'pl-1', knowledge_skills_bloc: 'CROSS_FUNCTIONAL' }));
        component.changeBloc(row, 'CROSS_FUNCTIONAL');
        expect(unitService.changeBloc).toHaveBeenCalledWith('u-1', 'pl-1', 'CROSS_FUNCTIONAL');
        expect(component.curriculum()[0].bloc).toBe('CROSS_FUNCTIONAL');

        unitService.changeBloc.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
        component.changeBloc(component.curriculum()[0], 'FONDAMENTAL');
        expect(component.curriculum()[0].bloc).toBe('CROSS_FUNCTIONAL');
        expect(messages.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error' }));
    });

    it('n’appelle pas le serveur quand le bloc ne change pas', async () => {
        await create();
        component.changeBloc(component.curriculum()[0], 'FONDAMENTAL');
        expect(unitService.changeBloc).not.toHaveBeenCalled();
    });

    it('retire une promotion après confirmation et affiche le 409', async () => {
        await create();
        unitService.removeFromCurriculum.and.returnValue(
            throwError(() => new HttpErrorResponse({ status: 409, error: { detail: 'Des séances sont à venir.' } }))
        );
        component.confirmRemoveFromCurriculum(component.curriculum()[0]);
        expect(unitService.removeFromCurriculum).toHaveBeenCalledWith('u-1', 'pl-1');
        expect(component.curriculum().length).toBe(1);
        expect(messages.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', detail: 'Des séances sont à venir.' }));

        unitService.removeFromCurriculum.and.returnValue(of(undefined));
        component.confirmRemoveFromCurriculum(component.curriculum()[0]);
        expect(component.curriculum()).toEqual([]);
    });

    it('rattache un cours de la faculté, avec ou sans crédits propres', async () => {
        await create();
        component.openAttach();
        expect(courseService.getAll).toHaveBeenCalledWith('fac-1');
        expect(component.attachOptions()).toEqual([{ label: 'RES-201 — Réseaux', value: 'c-2' }]);

        component.attachForm.setValue({ course_id: 'c-2', credits: null });
        expect(component.defaultCredits()).toBe(4);
        unitService.attachCourse.and.returnValue(of({ course_id: 'c-2', code: 'RES-201', name: 'Réseaux', credits: 4 }));
        component.submitAttach();
        expect(unitService.attachCourse).toHaveBeenCalledWith('u-1', { course_id: 'c-2' });
        expect(component.courses().map((course) => course.code)).toEqual(['ALG-101', 'RES-201']);
        expect(component.attachOptions()).toEqual([]);

        component.attachForm.setValue({ course_id: 'c-2', credits: 2 });
        component.submitAttach();
        expect(unitService.attachCourse).toHaveBeenCalledWith('u-1', { course_id: 'c-2', credits: 2 });
    });

    it('détache un cours après confirmation', async () => {
        await create();
        unitService.detachCourse.and.returnValue(of(undefined));
        component.confirmDetach(component.courses()[0]);
        expect(unitService.detachCourse).toHaveBeenCalledWith('u-1', 'c-1');
        expect(component.courses()).toEqual([]);
    });

    it('masque la gestion sans droit d’écriture', async () => {
        await create(false);
        const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
        expect(text).not.toContain('Inscrire dans une promotion');
        expect(text).not.toContain('Rattacher un cours');
        expect((fixture.nativeElement as HTMLElement).querySelector('p-select')).toBeNull();
    });
});
