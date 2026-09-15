import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { AcademicPermission } from '../../permissions/permission.model';

@Component({
    selector: 'app-academic-home-redirect',
    standalone: true,
    template: ''
})
export class AcademicHomeRedirect implements OnInit {
    private readonly router = inject(Router);
    private readonly permissionService = inject(PermissionService);

    ngOnInit(): void {
        if (this.permissionService.hasAnyPermission([AcademicPermission.FacultyReadAll])) {
            void this.router.navigate(['/academic/faculties']);
            return;
        }

        if (this.permissionService.hasAnyPermission([AcademicPermission.FacultyReadOwn])) {
            void this.router.navigate(['/academic/my-faculty']);
            return;
        }

        if (this.permissionService.hasAnyPermission([AcademicPermission.CourseReadAll, AcademicPermission.CourseReadOwn])) {
            void this.router.navigate(['/academic/courses']);
            return;
        }

        void this.router.navigate(['/access-denied']);
    }
}