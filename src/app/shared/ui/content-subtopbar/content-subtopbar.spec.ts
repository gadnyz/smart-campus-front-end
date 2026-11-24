import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '@/app/core/auth/services/auth.service';
import { ContentSubtopbar, SubtopbarAction } from './content-subtopbar';

describe('ContentSubtopbar', () => {
    let fixture: ComponentFixture<ContentSubtopbar>;
    let component: ContentSubtopbar;

    const actions: SubtopbarAction[] = [
        { label: 'Liste' },
        { label: 'Modifier', primary: true },
        { label: 'Imprimer' },
        { label: 'Supprimer', severity: 'danger' }
    ];

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [ContentSubtopbar],
            providers: [provideRouter([]), { provide: AuthService, useValue: { getCurrentUser: () => ({ id: 'u', authorities: [] }) } }]
        });
        fixture = TestBed.createComponent(ContentSubtopbar);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('actions', actions);
    });

    it('should keep every action as a button by default', () => {
        fixture.detectChanges();
        expect(component.visibleActions().length).toBe(4);
        expect(component.menuItems()).toEqual([]);
    });

    it('should keep the primary actions visible and put the others in the tools menu', () => {
        fixture.componentRef.setInput('maxVisible', 2);
        fixture.detectChanges();

        expect(component.visibleActions().map((action) => action.label)).toEqual(['Liste', 'Modifier']);
        expect(component.menuItems().map((item) => item.label)).toEqual(['Imprimer', 'Supprimer']);
        expect((fixture.nativeElement as HTMLElement).querySelector('[aria-label="Autres actions"]')).not.toBeNull();
    });

    it('should show previous, next and the position of the record', () => {
        const previous = jasmine.createSpy('previous');
        fixture.componentRef.setInput('navigation', { position: '3/42', hasPrevious: true, hasNext: false, previous, next: () => undefined });
        fixture.detectChanges();
        const html = fixture.nativeElement as HTMLElement;

        expect(html.querySelector('.content-subtopbar-position')?.textContent).toContain('3/42');
        (html.querySelector('[aria-label="Fiche précédente"]') as HTMLButtonElement).click();
        expect(previous).toHaveBeenCalled();
        expect((html.querySelector('[aria-label="Fiche suivante"]') as HTMLButtonElement).disabled).toBeTrue();
    });
});
