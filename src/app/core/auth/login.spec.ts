import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Login } from './login';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { AuthService } from './services/auth.service';
import { AuthResponse } from './models/auth.model';

describe('Login', () => {
    let component: Login;
    let fixture: ComponentFixture<Login>;
    let authService: jasmine.SpyObj<AuthService>;
    let router: Router;

    const authResponse: AuthResponse = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        token_type: 'Bearer',
        expire_in: 3600,
        user: {
            id: 'user-1',
            username: 'Campus Admin',
            email: 'admin@unh.edu',
            profile: 'ADMIN',
            enabled: true,
            created_at: '2026-05-16T08:00:00.000Z',
            updated_at: '2026-05-16T08:00:00.000Z',
            last_connected_at: null,
            avatar_url: null,
            authorities: ['ROLE_ADMIN']
        }
    };

    function createForm(isValid: boolean): jasmine.SpyObj<HTMLFormElement> {
        const form = jasmine.createSpyObj<HTMLFormElement>('HTMLFormElement', ['reportValidity']);
        form.reportValidity.and.returnValue(isValid);
        return form;
    }

    beforeEach(async () => {
        authService = jasmine.createSpyObj<AuthService>('AuthService', ['login', 'storeSession']);

        await TestBed.configureTestingModule({
            imports: [Login],
            providers: [provideRouter([]), { provide: AuthService, useValue: authService }]
        }).compileComponents();

        router = TestBed.inject(Router);
        spyOn(router, 'navigate').and.resolveTo(true);

        fixture = TestBed.createComponent(Login);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the login component', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize the form state with empty credentials', () => {
        expect(component.email).toBe('');
        expect(component.password).toBe('');
        expect(component.checked).toBeFalse();
    });

    it('should render email, password and sign in action', () => {
        const emailInput = fixture.debugElement.query(By.css('#email1'));
        const passwordInput = fixture.debugElement.query(By.css('#password1'));
        const signInButton = fixture.nativeElement.textContent;

        expect(emailInput).toBeTruthy();
        expect(passwordInput).toBeTruthy();
        expect(signInButton).toContain('Se connecter');
    });

    it('should submit trimmed credentials, store the session and navigate on successful login', () => {
        authService.login.and.returnValue(of(authResponse));
        component.email = '  admin@unh.edu  ';
        component.password = 'correct-password';

        component.submit(createForm(true));

        expect(authService.login).toHaveBeenCalledOnceWith({
            email: 'admin@unh.edu',
            password: 'correct-password'
        });
        expect(authService.storeSession).toHaveBeenCalledOnceWith(authResponse);
        expect(router.navigate).toHaveBeenCalledOnceWith(['/']);
        expect(component.loading()).toBeFalse();
        expect(component.errorMessage()).toBe('');
        expect(component.validationErrors()).toEqual({});
    });

    it('should surface server failures without storing a session', () => {
        authService.login.and.returnValue(
            throwError(
                () =>
                    new HttpErrorResponse({
                        status: 500,
                        statusText: 'Server Error',
                        error: { detail: 'Une erreur est survenue lors de la connexion. Veuillez réessayer plus tard.' }
                    })
            )
        );
        component.email = 'admin@unh.edu';
        component.password = 'correct-password';

        component.submit(createForm(true));

        expect(authService.storeSession).not.toHaveBeenCalled();
        expect(router.navigate).not.toHaveBeenCalled();
        expect(component.loading()).toBeFalse();
        expect(component.errorMessage()).toBe('Une erreur est survenue lors de la connexion. Veuillez réessayer plus tard.');
    });

    it('should surface invalid credentials without storing a session', () => {
        authService.login.and.returnValue(
            throwError(
                () =>
                    new HttpErrorResponse({
                        status: 401,
                        statusText: 'Unauthorized',
                        error: { detail: 'Email ou mot de passe incorrect. Veuillez réessayer' }
                    })
            )
        );
        component.email = 'admin@unh.edu';
        component.password = 'wrong-password';

        component.submit(createForm(true));

        expect(authService.storeSession).not.toHaveBeenCalled();
        expect(router.navigate).not.toHaveBeenCalled();
        expect(component.loading()).toBeFalse();
        expect(component.errorMessage()).toBe('Email ou mot de passe incorrect. Veuillez réessayer');
    });

    it('should not call login when email is missing', () => {
        component.email = '';
        component.password = 'correct-password';

        component.submit(createForm(false));

        expect(authService.login).not.toHaveBeenCalled();
        expect(authService.storeSession).not.toHaveBeenCalled();
        expect(router.navigate).not.toHaveBeenCalled();
        expect(component.loading()).toBeFalse();
    });

    it('should not call login when password is missing', () => {
        component.email = 'admin@unh.edu';
        component.password = '';

        component.submit(createForm(false));

        expect(authService.login).not.toHaveBeenCalled();
        expect(authService.storeSession).not.toHaveBeenCalled();
        expect(router.navigate).not.toHaveBeenCalled();
        expect(component.loading()).toBeFalse();
    });

    it('should surface server unreachable error (status 0)', () => {
        authService.login.and.returnValue(
            throwError(
                () =>
                    new HttpErrorResponse({
                        status: 0,
                        statusText: 'Unknown Error'
                    })
            )
        );
        component.email = 'admin@unh.edu';
        component.password = 'correct-password';

        component.submit(createForm(true));

        expect(component.loading()).toBeFalse();
        expect(component.errorMessage()).toBe('Impossible de joindre le serveur.');
    });

    it('should surface validation errors (status 400 with invalid_fields)', () => {
        authService.login.and.returnValue(
            throwError(
                () =>
                    new HttpErrorResponse({
                        status: 400,
                        statusText: 'Bad Request',
                        error: {
                            detail: 'Veuillez vérifier les informations saisies.',
                            invalid_fields: {
                                email: 'Format email invalide.',
                                password: 'Mot de passe trop court.'
                            }
                        }
                    })
            )
        );
        component.email = 'admin@unh.edu';
        component.password = '123';

        component.submit(createForm(true));

        expect(component.loading()).toBeFalse();
        expect(component.errorMessage()).toBe('Veuillez vérifier les informations saisies.');
        expect(component.validationErrors()).toEqual({
            email: 'Format email invalide.',
            password: 'Mot de passe trop court.'
        });
    });

    it('should surface forbidden access error (status 403)', () => {
        authService.login.and.returnValue(
            throwError(
                () =>
                    new HttpErrorResponse({
                        status: 403,
                        statusText: 'Forbidden',
                        error: { detail: 'Accès refusé.' }
                    })
            )
        );
        component.email = 'admin@unh.edu';
        component.password = 'correct-password';

        component.submit(createForm(true));

        expect(component.loading()).toBeFalse();
        expect(component.errorMessage()).toBe('Accès refusé.');
    });

    it('should surface server error default fallback (status 500 without detail)', () => {
        authService.login.and.returnValue(
            throwError(
                () =>
                    new HttpErrorResponse({
                        status: 500,
                        statusText: 'Internal Server Error'
                    })
            )
        );
        component.email = 'admin@unh.edu';
        component.password = 'correct-password';

        component.submit(createForm(true));

        expect(component.loading()).toBeFalse();
        expect(component.errorMessage()).toBe('Une erreur serveur est survenue. Réessaie plus tard.');
    });

    it('should surface fallback error message for unhandled status codes (e.g. 404)', () => {
        authService.login.and.returnValue(
            throwError(
                () =>
                    new HttpErrorResponse({
                        status: 404,
                        statusText: 'Not Found',
                        error: { detail: 'Une erreur est survenue lors de la connexion. Veuillez réessayer plus tard' }
                    })
            )
        );
        component.email = 'admin@unh.edu';
        component.password = 'correct-password';

        component.submit(createForm(true));

        expect(component.loading()).toBeFalse();
        expect(component.errorMessage()).toBe('Une erreur est survenue lors de la connexion. Veuillez réessayer plus tard.');
    });
});
