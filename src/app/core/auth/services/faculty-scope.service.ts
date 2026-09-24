import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { AcademicPermission } from '@/app/features/academic/permissions/permission.model';

@Injectable({ providedIn: 'root' })
export class FacultyScopeService {
    private readonly auth = inject(AuthService);
    private readonly permissions = inject(PermissionService);

    readonly isFacultyScoped = computed(
        () =>
            this.permissions.hasPermission(AcademicPermission.FacultyReadOwn) &&
            !this.permissions.hasPermission(AcademicPermission.FacultyReadAll)
    );

    readonly facultyId = computed(() => this.auth.getCurrentUser()?.faculty_id ?? null);

    /** Id à forcer sur les listes, ou `null` si rôle global. */
    scopedId(): string | null {
        return this.isFacultyScoped() ? this.facultyId() : null;
    }
}