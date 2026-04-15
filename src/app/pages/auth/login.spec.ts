import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Login } from './login';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('Login', () => {
    let component: Login;
    let fixture: ComponentFixture<Login>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [Login, NoopAnimationsModule]
        }).compileComponents();

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
        expect(signInButton).toContain('Sign In');
    });
});
