import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { AcademicManage, AcademicPermission } from '../../permissions/permission.model';

@Component({
    selector: 'app-academic-home-redirect',
    standalone: true,
    template: ''
})
export class AcademicHomeRedirect implements OnInit {
    private readonly router = inject(Router);
    private readonly permissionService = inject(PermissionService);

    /** Premier écran accessible : les écrans de gestion d'abord, puis les écrans personnels. */
    ngOnInit(): void {
        const has = (permissions: readonly string[]) => this.permissionService.hasAnyPermission(permissions);
        const targets: [readonly string[], string][] = [
            [AcademicManage.Faculty, '/academic/faculties'],
            [[AcademicPermission.FacultyReadOwn], '/academic/my-faculty'],
            [AcademicManage.Course, '/academic/courses'],
            [[AcademicPermission.CourseReadOwn, AcademicPermission.ProfessorReadOwn], '/academic/my-courses'],
            [AcademicManage.Professor, '/academic/professors'],
            [AcademicManage.Student, '/academic/students']
        ];
        const target = targets.find(([permissions]) => has(permissions))?.[1] ?? '/access-denied';
        void this.router.navigate([target]);
    }
}
