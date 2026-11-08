import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Professor } from '../../models/professor.model';
import { ProfessorService } from '../../services/professor.service';
import { ProfessorStatsWidget } from './professor-stats-widget';

describe('ProfessorStatsWidget', () => {
    let component: ProfessorStatsWidget;
    let fixture: ComponentFixture<ProfessorStatsWidget>;
    let professorService: jasmine.SpyObj<ProfessorService>;

    const professors: Professor[] = [
        {
            id: 'p-1',
            first_name: 'Jean',
            last_name: 'Mbuyi',
            faculty_id: 'fac-1'
        },
        {
            id: 'p-2',
            first_name: 'Claire',
            last_name: 'Kalala',
            faculty_id: 'fac-1'
        }
    ];

    beforeEach(async () => {
        professorService = jasmine.createSpyObj<ProfessorService>('ProfessorService', ['list']);
        professorService.list.and.returnValue(of({ content: professors.slice(0, 1), page: 0, size: 1, total_elements: professors.length, total_pages: 2 }));

        await TestBed.configureTestingModule({
            imports: [ProfessorStatsWidget],
            providers: [{ provide: ProfessorService, useValue: professorService }]
        }).compileComponents();

        fixture = TestBed.createComponent(ProfessorStatsWidget);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
    });

    it('should display the academic professors count', () => {
        // Le total vient de la première page, sans charger tous les professeurs.
        expect(professorService.list).toHaveBeenCalledWith({ page: 0, size: 1 });
        expect(component.stat().value).toBe(2);
        expect(component.stat().loading).toBeFalse();
        expect(component.stat().listRoute).toBe('/academic/professors');
    });

    it('should fall back to "-" on API error', async () => {
        professorService.list.and.returnValue(throwError(() => new Error('offline')));
        fixture = TestBed.createComponent(ProfessorStatsWidget);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
        expect(component.stat().value).toBe('-');
    });
});
