import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { AcademicPermission } from '../../permissions/permission.model';
import { AcademicHomeRedirect } from './academic-home-redirect';

describe('AcademicHomeRedirect', () => {
    let permissionService: jasmine.SpyObj<PermissionService>;
    let router: Router;

    async function createComponent(): Promise<void> {
        await TestBed.configureTestingModule({
            imports: [AcademicHomeRedirect],
            providers: [
                provideRouter([]),
                { provide: PermissionService, useValue: permissionService }
            ]
        }).compileComponents();
        router = TestBed.inject(Router);
        spyOn(router, 'navigate');
        const fixture: ComponentFixture<AcademicHomeRedirect> = TestBed.createComponent(AcademicHomeRedirect);
        fixture.detectChanges();
    }

    beforeEach(() => {
        permissionService = jasmine.createSpyObj<PermissionService>('PermissionService', ['hasAnyPermission']);
        TestBed.resetTestingModule();
    });

    it('should send a professor to Mes cours', async () => {
        permissionService.hasAnyPermission.and.callFake((permissions) =>
            permissions.includes(AcademicPermission.CourseReadOwn)
        );
        await createComponent();
        expect(router.navigate).toHaveBeenCalledWith(['/academic/my-courses']);
    });

    it('should send an academic admin to the professors list when that is the only academic right', async () => {
        permissionService.hasAnyPermission.and.callFake((permissions) =>
            permissions.includes(AcademicPermission.ProfessorReadAll)
        );
        await createComponent();
        expect(router.navigate).toHaveBeenCalledWith(['/academic/professors']);
    });
});
