import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { IdentityPermission } from '@/app/features/identity/permissions/permission.model';
import { DetailNavigationService } from '@/app/shared/navigation/detail-navigation.service';
import { User } from '../../models/user.model';
import { UsersService } from '../../services/user.service';
import { UserList } from './user-list';

describe('UserList', () => {
    let component: UserList;
    let fixture: ComponentFixture<UserList>;
    let usersService: jasmine.SpyObj<UsersService>;
    let permissionService: jasmine.SpyObj<PermissionService>;
    let messageService: MessageService;
    let detailNavigation: jasmine.SpyObj<DetailNavigationService>;

    const sampleUser: User = {
        id: 'u-1',
        username: 'campus.admin',
        email: 'admin@unh.edu',
        profiles: ['ADMIN'],
        enabled: true,
        created_at: '2026-05-16T08:00:00.000Z',
        updated_at: '2026-05-16T08:00:00.000Z',
        last_connected_at: null,
        avatar_url: null,
        authorities: []
    };

    beforeEach(async () => {
        usersService = jasmine.createSpyObj<UsersService>('UsersService', ['getUsers', 'deleteUser']);
        permissionService = jasmine.createSpyObj<PermissionService>('PermissionService', ['hasAnyPermission']);
        detailNavigation = jasmine.createSpyObj<DetailNavigationService>('DetailNavigationService', ['setContext']);

        permissionService.hasAnyPermission.and.returnValue(false);
        usersService.getUsers.and.returnValue(
            of({
                content: [],
                page: 0,
                size: 100,
                total_elements: 0,
                total_pages: 0
            })
        );

        await TestBed.configureTestingModule({
            imports: [UserList],
            providers: [
                provideRouter([]),
                ConfirmationService,
                { provide: UsersService, useValue: usersService },
                { provide: PermissionService, useValue: permissionService },
                { provide: DetailNavigationService, useValue: detailNavigation }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(UserList);
        component = fixture.componentInstance;
        messageService = fixture.debugElement.injector.get(MessageService);
        spyOn(messageService, 'add');
        fixture.detectChanges();
    });

    it('should create and load users on init', () => {
        expect(component).toBeTruthy();
        expect(usersService.getUsers).toHaveBeenCalledWith({ page: 0, size: 100 });
    });

    describe('Risk #3 — empty API must not contradict UI', () => {
        it('should render empty-state copy when API returns zero users', () => {
            expect(component.users()).toEqual([]);
            expect(component.loading()).toBeFalse();
            expect(fixture.nativeElement.textContent).toContain('Aucun utilisateur trouvé');
            expect(detailNavigation.setContext).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    totalElements: 0,
                    items: []
                })
            );
        });

        it('should display users when API returns content', () => {
            usersService.getUsers.and.returnValue(
                of({
                    content: [sampleUser],
                    page: 0,
                    size: 100,
                    total_elements: 1,
                    total_pages: 1
                })
            );

            component.loadUsers();
            fixture.detectChanges();

            expect(component.users()).toEqual([sampleUser]);
            expect(component.rows()[0].profilesLabel).toBe('ADMIN');
            expect(fixture.nativeElement.textContent).toContain('campus.admin');
            expect(fixture.nativeElement.textContent).not.toContain('Aucun utilisateur trouvé');
        });
    });

    it('should format missing profiles as "Sans profil"', () => {
        expect(component.formatProfiles({ ...sampleUser, profiles: [] })).toBe('Sans profil');
    });

    it('should gate delete actions on UserDeleteAll', () => {
        permissionService.hasAnyPermission.and.returnValue(true);
        fixture = TestBed.createComponent(UserList);
        component = fixture.componentInstance;
        fixture.detectChanges();

        expect(component.canDeleteUsers()).toBeTrue();
        expect(permissionService.hasAnyPermission).toHaveBeenCalledWith([IdentityPermission.UserDeleteAll]);
    });

    it('should toast an error and clear the list on load failure', () => {
        usersService.getUsers.and.returnValue(throwError(() => new Error('network')));

        component.loadUsers();

        expect(component.users()).toEqual([]);
        expect(component.loading()).toBeFalse();
        expect(messageService.add).toHaveBeenCalledWith(
            jasmine.objectContaining({
                severity: 'error',
                detail: 'Impossible de charger les utilisateurs.'
            })
        );
    });

    it('should confirm then delete a user and refresh the local list', () => {
        const confirmation = fixture.debugElement.injector.get(ConfirmationService);
        spyOn(confirmation, 'confirm').and.callFake((options) => {
            options.accept?.();
            return confirmation;
        });
        usersService.deleteUser.and.returnValue(of(void 0));
        component.users.set([sampleUser]);

        component.confirmDelete({ ...sampleUser, profilesLabel: 'ADMIN' });

        expect(usersService.deleteUser).toHaveBeenCalledOnceWith('u-1');
        expect(component.users()).toEqual([]);
        expect(messageService.add).toHaveBeenCalledWith(
            jasmine.objectContaining({
                severity: 'success',
                detail: 'Utilisateur supprimé avec succès.'
            })
        );
    });
});
