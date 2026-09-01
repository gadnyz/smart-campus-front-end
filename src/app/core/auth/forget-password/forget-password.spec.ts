import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { forgetPassword } from './forget-password';

describe('forgetPassword', () => {
    let component: forgetPassword;
    let fixture: ComponentFixture<forgetPassword>;
    let authService: jasmine.SpyObj<AuthService>;

    function createForm(isValid: boolean): jasmine.SpyObj<HTMLFormElement> {
        const form = jasmine.createSpyObj<HTMLFormElement>('HTMLFormElement', ['reportValidity']);
        form.reportValidity.and.returnValue(isValid);
        return form;
    }

    beforeEach(async () => {
        authService = jasmine.createSpyObj<AuthService>('AuthService', ['forgotPassword']);

        await TestBed.configureTestingModule({
            imports: [forgetPassword],
            providers: [provideRouter([]), { provide: AuthService, useValue: authService }]
        }).compileComponents();

        fixture = TestBed.createComponent(forgetPassword);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should not call the API when the form is invalid', () => {
        component.email = '';
        component.submit(createForm(false));

        expect(authService.forgotPassword).not.toHaveBeenCalled();
    });

    it('should trim the email and show the generic success message on success', () => {
        authService.forgotPassword.and.returnValue(of(void 0));
        component.email = '  admin@unh.edu  ';

        component.submit(createForm(true));

        expect(authService.forgotPassword).toHaveBeenCalledOnceWith({ email: 'admin@unh.edu' });
        expect(component.loading()).toBeFalse();
        expect(component.successMessage()).toContain('Si cette adresse email est associée à un compte');
        expect(component.errorMessage()).toBe('');
    });

    it('should treat 403 as a success message (anti email-enumeration)', () => {
        authService.forgotPassword.and.returnValue(
            throwError(() => new HttpErrorResponse({ status: 403 }))
        );
        component.email = 'unknown@unh.edu';

        component.submit(createForm(true));

        expect(component.successMessage()).toContain('Si cette adresse email est associée à un compte');
        expect(component.errorMessage()).toBe('');
    });

    it('should surface offline / status 0 with a clear recovery message', () => {
        authService.forgotPassword.and.returnValue(
            throwError(() => new HttpErrorResponse({ status: 0 }))
        );
        component.email = 'admin@unh.edu';

        component.submit(createForm(true));

        expect(component.errorMessage()).toContain('momentanément indisponible');
    });

    it('should rate-limit feedback on 429', () => {
        authService.forgotPassword.and.returnValue(
            throwError(() => new HttpErrorResponse({ status: 429 }))
        );
        component.email = 'admin@unh.edu';

        component.submit(createForm(true));

        expect(component.errorMessage()).toContain('Trop de tentatives');
    });

    it('should surface 500 server failures', () => {
        authService.forgotPassword.and.returnValue(
            throwError(() => new HttpErrorResponse({ status: 500 }))
        );
        component.email = 'admin@unh.edu';

        component.submit(createForm(true));

        expect(component.errorMessage()).toContain('lien de récupération');
    });

    describe('error guessing — rapid repeated submits', () => {
        it('should allow consecutive submits without crashing', () => {
            authService.forgotPassword.and.returnValue(of(void 0));
            component.email = 'admin@unh.edu';

            component.submit(createForm(true));
            component.submit(createForm(true));

            expect(authService.forgotPassword).toHaveBeenCalledTimes(2);
            expect(component.loading()).toBeFalse();
        });
    });
});
