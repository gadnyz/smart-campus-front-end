import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '@/app/core/auth/services/auth.service';
import { LogoutRequest, AuthenticatedUser } from '@/app/core/auth/models/auth.model';
import { of, throwError } from 'rxjs';
import { AppTopbar } from './app.topbar';
import { signal } from '@angular/core';

describe('AppTopbar logout', () => {
    let component: AppTopbar;
    let fixture: ComponentFixture<AppTopbar>;
    let authService: jasmine.SpyObj<AuthService>;
    let router: Router;

    const logoutPayload: LogoutRequest = {
        access_token: 'access-token',
        refresh_token: 'refresh-token'
    };

    const authenticatedUser: AuthenticatedUser = {
        id: 'user-1',
        username: 'Campus Admin',
        email: 'admin@unh.edu',
        profiles: ['ADMIN'],
        enabled: true,
        created_at: '2026-05-16T08:00:00.000Z',
        updated_at: '2026-05-16T08:00:00.000Z',
        last_connected_at: null,
        avatar_url: null,
        authorities: ['ROLE_ADMIN']
    };

    beforeEach(async () => {
        authService = jasmine.createSpyObj<AuthService>('AuthService', ['getLogoutPayload', 'logoutRequest', 'clearSession']);
        Object.defineProperty(authService, 'currentUser', {
            value: signal<AuthenticatedUser | null>(authenticatedUser)
        });

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
