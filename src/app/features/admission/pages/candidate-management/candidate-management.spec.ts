import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { DetailNavigationService } from '@/app/shared/navigation/detail-navigation.service';

import { CandidateListItem } from '../../models/candidate.model';
import { AdmissionAcademicReferenceService } from '../../services/admission-academic-reference.service';
import { CandidateService } from '../../services/candidate.service';
import { CandidateManagement } from './candidate-management';

describe('CandidateManagement', () => {
    let component: CandidateManagement;
    let fixture: ComponentFixture<CandidateManagement>;
    let candidateService: jasmine.SpyObj<CandidateService>;
    let academicReferenceService: jasmine.SpyObj<AdmissionAcademicReferenceService>;

    const candidates: CandidateListItem[] = [
        {
            id: 'c1',
            first_name: 'Ada',
            middle_name: '',
            last_name: 'Lovelace',
            gender: 'FEMALE',
            email: 'ada@example.com',
            phone: '+243810000001',
            status: 'PENDING',
            submitted_at: '2026-01-10T10:00:00Z',
            created_at: '2026-01-10T10:00:00Z'
        }
    ];

    beforeEach(async () => {
        candidateService = jasmine.createSpyObj<CandidateService>(
            'CandidateService',
            ['getAll']
        );
        academicReferenceService =
            jasmine.createSpyObj<AdmissionAcademicReferenceService>(
                'AdmissionAcademicReferenceService',
                ['getFacultyOptions']
            );

        candidateService.getAll.and.returnValue(
            of({
                content: candidates,
                page: 0,
                size: 10,
                total_elements: 1,
                total_pages: 1
            })
        );
        academicReferenceService.getFacultyOptions.and.returnValue(
            of([{ label: 'Sciences', value: 'fac-1' }])
        );

        await TestBed.configureTestingModule({
            imports: [CandidateManagement],
            providers: [
                provideRouter([]),
                { provide: CandidateService, useValue: candidateService },
                {
                    provide: AdmissionAcademicReferenceService,
                    useValue: academicReferenceService
                },
                DetailNavigationService
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(CandidateManagement);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
    });

    it('should create and load candidates', () => {
        expect(component).toBeTruthy();
        expect(candidateService.getAll).toHaveBeenCalled();
        expect(component.candidates()).toEqual(candidates);
        expect(component.totalElements()).toBe(1);
    });

    it('should reload with status filter', () => {
        candidateService.getAll.calls.reset();

        component.onStatusChange('PENDING');

        expect(component.statusFilter()).toBe('PENDING');
        expect(candidateService.getAll).toHaveBeenCalledWith(
            jasmine.objectContaining({
                page: 0,
                status: 'PENDING'
            })
        );
    });

    it('should reload with faculty filter', () => {
        candidateService.getAll.calls.reset();

        component.onFacultyChange('fac-1');

        expect(component.facultyFilter()).toBe('fac-1');
        expect(candidateService.getAll).toHaveBeenCalledWith(
            jasmine.objectContaining({
                page: 0,
                facultyId: 'fac-1'
            })
        );
    });
});
