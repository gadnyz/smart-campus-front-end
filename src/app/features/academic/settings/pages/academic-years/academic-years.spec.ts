import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { academicYearLabel } from '../../../models/academic-year.model';
import { AcademicCatalogService } from '../../../services/academic-catalog.service';
import { AcademicYearService } from '../../../services/academic-year.service';
import { AcademicYearsPage } from './academic-years';

describe('AcademicYearsPage — libellé de l’année', () => {
    let fixture: ComponentFixture<AcademicYearsPage>;
    let page: AcademicYearsPage;

    beforeEach(async () => {
        const years = jasmine.createSpyObj<AcademicYearService>('AcademicYearService', ['getAll', 'getCurrent', 'create', 'activate', 'close']);
        years.getAll.and.returnValue(of([]));
        years.getCurrent.and.returnValue(of({ id: 'y-1', label: '2026-2027', start_date: '2026-10-15', end_date: '2027-10-14', status: 'ACTIVE' }));
        await TestBed.configureTestingModule({
            imports: [AcademicYearsPage],
            providers: [
                provideRouter([]),
                { provide: AcademicYearService, useValue: years },
                { provide: AcademicCatalogService, useValue: jasmine.createSpyObj('AcademicCatalogService', ['invalidateAcademicYears']) },
                { provide: PermissionService, useValue: { hasAnyPermission: () => true, canAccess: () => true } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(AcademicYearsPage);
        page = fixture.componentInstance;
        fixture.detectChanges();
        page.openCreateDialog();
    });

    it('should build the label from the years of the dates', () => {
        expect(academicYearLabel(new Date(2026, 9, 15), new Date(2027, 9, 14))).toBe('2026-2027');
        expect(academicYearLabel(null, new Date(2027, 9, 14))).toBe('');
    });

    it('should suggest the label while the user has not changed it', () => {
        page.createForm.patchValue({ start_date: new Date(2026, 9, 15), end_date: new Date(2027, 9, 14) });
        expect(page.createForm.controls.label.value).toBe('2026-2027');

        page.createForm.patchValue({ end_date: new Date(2028, 9, 14) });
        expect(page.createForm.controls.label.value).toBe('2026-2028');
    });

    it('should refuse a label that contradicts the dates, like 2026-2026', () => {
        page.createForm.patchValue({ start_date: new Date(2026, 9, 15), end_date: new Date(2027, 9, 14) });
        page.createForm.controls.label.setValue('2026-2026');

        expect(page.createForm.errors?.['labelMismatch']).toBe('2026-2027');
        expect(page.createForm.valid).toBeFalse();
    });
});
