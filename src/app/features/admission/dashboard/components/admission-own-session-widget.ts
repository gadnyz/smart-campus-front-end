import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { PermissionService } from '@/app/core/permissions/permission.service';
import { DashboardCard } from '@/app/shared/ui/dashboard/dashboard-card/dashboard-card';
import { AcademicPermission } from '@/app/features/academic/permissions/permission.model';
import { AdmissionPermission } from '../../permissions/permission.model';
import { CandidateService } from '../../services/candidate.service';

@Component({
    selector: 'app-admission-own-session-widget',
    standalone: true,
    imports: [CommonModule, DashboardCard],
    template: `
        @if (studentPlaceholder()) {
            <app-dashboard-card>
                <div class="font-semibold text-xl mb-2">Espace étudiant</div>
                <p class="text-color-secondary m-0">
                    Votre admission a été validée. L’espace étudiant n’est pas encore disponible.
                    Le formulaire d’admission n’est plus modifiable.
                </p>
            </app-dashboard-card>
        }
    `
})
export class AdmissionOwnSessionWidget implements OnInit {
    private readonly router = inject(Router);
    private readonly permissionService = inject(PermissionService);
    private readonly candidateService = inject(CandidateService);

    readonly studentPlaceholder = signal(false);

    ngOnInit(): void {
        if (this.isStudentAccount()) {
            this.studentPlaceholder.set(true);
            return;
        }

        if (!this.isCandidateAccount()) {
            return;
        }

        this.candidateService.getMine(true).subscribe({
            next: (candidate) => {
                if (candidate.candidature.status === 'VALIDATED') {
                    this.studentPlaceholder.set(true);
                    return;
                }

                void this.router.navigate(['/admission/my-application']);
            },
            error: (error: HttpErrorResponse) => {
                if (error.status === 404 || error.status === 400) {
                    void this.router.navigate(['/admission/my-application']);
                    return;
                }
            }
        });
    }

    private isStudentAccount(): boolean {
        return this.permissionService.hasPermission(
            AcademicPermission.StudentReadOwn
        );
    }

    private isCandidateAccount(): boolean {
        return this.permissionService.hasPermission(
            AdmissionPermission.AdmissionCandidateReadOwn
        );
    }
}