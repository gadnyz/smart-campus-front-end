import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '@/app/core/auth/services/auth.service';
import { LogoutRequest } from '@/app/core/auth/models/auth.model';
import { of, throwError } from 'rxjs';
import { AppTopbar } from './app.topbar';

describe('AppTopbar logout', () => {
    let component: AppTopbar;
    let fixture: ComponentFixture<AppTopbar>;
    let authService: jasmine.SpyObj<AuthService>;
    let router: Router;

    const logoutPayload: LogoutRequest = {
        access_token: 'access-token',
        refresh_token: 'refresh-token'
    };

    beforeEach(async () => {
        authService = jasmine.createSpyObj<AuthService>('AuthService', ['getLogoutPayload', 'logoutRequest', 'clearSession']);

        await TestBed.configureTestingModule({
            imports: [AppTopbar],
            providers: [provideRouter([]), { provide: AuthService, useValue: authService }]
        }).compileComponents();

        router = TestBed.inject(Router);
        spyOn(router, 'navigate').and.resolveTo(true);

        fixture = TestBed.createComponent(AppTopbar);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should clear session and route to login when no logout payload exists', () => {
        authService.getLogoutPayload.and.returnValue(null);

        component.logout();

        expect(authService.logoutRequest).not.toHaveBeenCalled();
        expect(authService.clearSession).toHaveBeenCalledOnceWith();
        expect(router.navigate).toHaveBeenCalledOnceWith(['/auth/login']);
    });

    it('should call the logout endpoint and clear the session on success', () => {
        authService.getLogoutPayload.and.returnValue(logoutPayload);
        authService.logoutRequest.and.returnValue(of(undefined));

        component.logout();

        expect(authService.logoutRequest).toHaveBeenCalledOnceWith(logoutPayload);
        expect(authService.clearSession).toHaveBeenCalledOnceWith();
        expect(router.navigate).toHaveBeenCalledOnceWith(['/auth/login']);
    });

    it('should clear tokens and route to login even when logout endpoint fails', () => {
        authService.getLogoutPayload.and.returnValue(logoutPayload);
        authService.logoutRequest.and.returnValue(throwError(() => new Error('Network failure')));

        component.logout();

        expect(authService.logoutRequest).toHaveBeenCalledOnceWith(logoutPayload);
        expect(authService.clearSession).toHaveBeenCalledOnceWith();
        expect(router.navigate).toHaveBeenCalledOnceWith(['/auth/login']);
    });
});
