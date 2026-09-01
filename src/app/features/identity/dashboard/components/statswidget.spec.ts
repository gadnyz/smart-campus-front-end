import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { IdentityPermission } from '@/app/features/identity/permissions/permission.model';
import { UsersService } from '@/app/features/identity/users/services/user.service';
import { StatsWidget } from './statswidget';

describe('StatsWidget (dashboard data consistency — Risk #3)', () => {
    let component: StatsWidget;
    let fixture: ComponentFixture<StatsWidget>;
    let usersService: jasmine.SpyObj<UsersService>;
    let permissionService: jasmine.SpyObj<PermissionService>;

    beforeEach(async () => {
        usersService = jasmine.createSpyObj<UsersService>('UsersService', ['getUsers']);
        permissionService = jasmine.createSpyObj<PermissionService>('PermissionService', ['hasAnyPermission']);
        permissionService.hasAnyPermission.and.returnValue(true);
        usersService.getUsers.and.returnValue(
            of({
                content: [],
                page: 0,
                size: 1,
                total_elements: 0,
                total_pages: 0
            })
        );

        await TestBed.configureTestingModule({
            imports: [StatsWidget],
            providers: [
                { provide: UsersService, useValue: usersService },
                { provide: PermissionService, useValue: permissionService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(StatsWidget);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create and request a minimal page for the users count', () => {
        expect(component).toBeTruthy();
        expect(permissionService.hasAnyPermission).toHaveBeenCalledWith([IdentityPermission.UserReadAll]);
        expect(usersService.getUsers).toHaveBeenCalledWith({ page: 0, size: 1 });
    });

    it('should display 0 utilisateurs when the API returns an empty collection (no stale 248)', () => {
        const usersStat = component.stats().find((stat) => stat.label === 'Utilisateurs');

        expect(usersStat?.value).toBe(0);
        expect(usersStat?.loading).toBeFalse();
        expect(usersStat?.value).not.toBe(248);
    });

    it('should sync the widget value with total_elements from the API', () => {
        usersService.getUsers.and.returnValue(
            of({
                content: [],
                page: 0,
                size: 1,
                total_elements: 12,
                total_pages: 12
            })
        );

        fixture = TestBed.createComponent(StatsWidget);
        component = fixture.componentInstance;
        fixture.detectChanges();

        expect(component.stats()[0].value).toBe(12);
    });

    it('should fall back to "-" on API error without crashing', () => {
        usersService.getUsers.and.returnValue(throwError(() => new Error('offline')));

        fixture = TestBed.createComponent(StatsWidget);
        component = fixture.componentInstance;
        fixture.detectChanges();

        expect(component.stats()[0].value).toBe('-');
        expect(component.stats()[0].loading).toBeFalse();
    });

    it('should not load users when UserReadAll is missing', () => {
        permissionService.hasAnyPermission.and.returnValue(false);
        usersService.getUsers.calls.reset();

        fixture = TestBed.createComponent(StatsWidget);
        component = fixture.componentInstance;
        fixture.detectChanges();

        expect(usersService.getUsers).not.toHaveBeenCalled();
        expect(fixture.nativeElement.querySelector('.dashboard-stats-grid')).toBeNull();
    });
});
