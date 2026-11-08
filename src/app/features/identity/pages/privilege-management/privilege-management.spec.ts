import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Confirmation, ConfirmationService, MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { IdentityManagementService } from '../../services/identity-management.service';
import { PRIVILEGE_NAME_PATTERN, PrivilegeManagement } from './privilege-management';

describe('PrivilegeManagement', () => {
    let component: PrivilegeManagement;
    let fixture: ComponentFixture<PrivilegeManagement>;
    let identityService: jasmine.SpyObj<IdentityManagementService>;
    let permissionService: jasmine.SpyObj<PermissionService>;
    let messages: MessageService;

    const privilege = (id: string, name: string) => ({ id, name, created_at: null, updated_at: null });

    async function create(canDelete = true): Promise<void> {
        permissionService.hasAnyPermission.and.returnValue(canDelete);
        fixture = TestBed.createComponent(PrivilegeManagement);
        component = fixture.componentInstance;
        const confirmation = fixture.debugElement.injector.get(ConfirmationService);
        spyOn(confirmation, 'confirm').and.callFake((options: Confirmation) => {
            options.accept?.();
            return confirmation;
        });
        messages = fixture.debugElement.injector.get(MessageService);
        spyOn(messages, 'add');
        fixture.detectChanges();
        await fixture.whenStable();
    }

    beforeEach(async () => {
        identityService = jasmine.createSpyObj<IdentityManagementService>('IdentityManagementService', ['getAllPrivileges', 'createPrivilege', 'deletePrivilege']);
        permissionService = jasmine.createSpyObj<PermissionService>('PermissionService', ['hasAnyPermission', 'canAccess']);
        permissionService.canAccess.and.returnValue(true);
        identityService.getAllPrivileges.and.returnValue(of([privilege('2', 'identity:user:read:all'), privilege('1', 'academic:course:read:faculty')]));

        await TestBed.configureTestingModule({
            imports: [PrivilegeManagement],
            providers: [provideRouter([]), { provide: IdentityManagementService, useValue: identityService }, { provide: PermissionService, useValue: permissionService }]
        }).compileComponents();
    });

    it('décrit chaque autorité : ressource, action, portée', async () => {
        await create();
        expect(component.rows().map((row) => [row.name, row.groupLabel, row.actionLabel, row.scopeLabel])).toEqual([
            ['academic:course:read:faculty', 'Académique › Cours', 'Consulter', jasmine.any(String) as unknown as string],
            ['identity:user:read:all', 'Identité › Utilisateurs', 'Consulter', jasmine.any(String) as unknown as string]
        ]);
    });

    it('n’accepte que le format module:ressource:action[:portée]', () => {
        expect(PRIVILEGE_NAME_PATTERN.test('academic:course:read:faculty')).toBeTrue();
        expect(PRIVILEGE_NAME_PATTERN.test('identity:api:manage')).toBeTrue();
        expect(PRIVILEGE_NAME_PATTERN.test('academic:course-unit:update:all')).toBeTrue();
        expect(PRIVILEGE_NAME_PATTERN.test('academic:course')).toBeFalse();
        expect(PRIVILEGE_NAME_PATTERN.test('Academic:Course:Read')).toBeFalse();
        expect(PRIVILEGE_NAME_PATTERN.test('a:b:c:d:e')).toBeFalse();
    });

    it('crée un privilège et l’ajoute à la liste', async () => {
        await create();
        identityService.createPrivilege.and.returnValue(of(privilege('3', 'scheduling:room:read:faculty')));
        component.openCreateDialog();
        component.createForm.controls.name.setValue('  scheduling:room:read:faculty ');
        expect(component.preview()).toContain('Planification › Salles — Consulter');
        component.submitCreate();

        expect(identityService.createPrivilege).toHaveBeenCalledWith({ name: 'scheduling:room:read:faculty' });
        expect(component.rows().length).toBe(3);
        expect(component.createDialogVisible()).toBeFalse();
    });

    it('refuse un doublon sans appeler le serveur', async () => {
        await create();
        component.openCreateDialog();
        component.createForm.controls.name.setValue('identity:user:read:all');
        component.submitCreate();
        expect(identityService.createPrivilege).not.toHaveBeenCalled();
        expect(component.createForm.controls.name.hasError('duplicate')).toBeTrue();
    });

    it('supprime après confirmation, et garde la ligne si le serveur refuse', async () => {
        await create();
        identityService.deletePrivilege.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404, error: { detail: 'Introuvable.' } })));
        component.confirmDelete(component.rows()[0]);
        expect(component.rows().length).toBe(2);
        expect(messages.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', detail: 'Introuvable.' }));

        identityService.deletePrivilege.and.returnValue(of(undefined));
        component.confirmDelete(component.rows()[0]);
        expect(identityService.deletePrivilege).toHaveBeenCalledWith('1');
        expect(component.rows().map((row) => row.id)).toEqual(['2']);
    });

    it('masque la suppression sans le droit', async () => {
        await create(false);
        expect((fixture.nativeElement as HTMLElement).querySelector('[aria-label^="Supprimer"]')).toBeNull();
    });
});
