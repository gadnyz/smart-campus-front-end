import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Error } from './error';

describe('Error page', () => {
    let fixture: ComponentFixture<Error>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [Error],
            providers: [provideRouter([])]
        }).compileComponents();

        fixture = TestBed.createComponent(Error);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(fixture.componentInstance).toBeTruthy();
    });

    it('should display the corrected headline "Error Occurred" (not "Error Occured")', () => {
        const headline = fixture.nativeElement.querySelector('h1') as HTMLHeadingElement;

        expect(headline.textContent?.trim()).toBe('Error Occurred');
        expect(fixture.nativeElement.textContent).not.toContain('Error Occured');
    });

    it('should offer a navigation action back to the dashboard', () => {
        expect(fixture.nativeElement.textContent).toContain('Go to Dashboard');
    });
});
