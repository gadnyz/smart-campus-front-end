import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppFloatingConfigurator } from '../../layout/component/app.floatingconfigurator';
import { ErrorPage } from './error';

describe('ErrorPage', () => {
    let fixture: ComponentFixture<ErrorPage>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ErrorPage],
            providers: [provideRouter([])]
        })
            // Monté dans ce test, le sélecteur de thème déconnecte le navigateur de Karma : il est hors sujet ici.
            .overrideComponent(ErrorPage, { remove: { imports: [AppFloatingConfigurator] }, add: { schemas: [NO_ERRORS_SCHEMA] } })
            .compileComponents();

        fixture = TestBed.createComponent(ErrorPage);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(fixture.componentInstance).toBeTruthy();
    });

    it('should display the headline in French', () => {
        const headline = fixture.nativeElement.querySelector('h1') as HTMLHeadingElement;
        expect(headline.textContent?.trim()).toBe('Une erreur est survenue');
    });

    it('should offer a way back to the dashboard, without any external image', () => {
        expect(fixture.nativeElement.textContent).toContain('Retour au tableau de bord');
        expect(fixture.nativeElement.querySelector('img')).toBeNull();
    });
});
