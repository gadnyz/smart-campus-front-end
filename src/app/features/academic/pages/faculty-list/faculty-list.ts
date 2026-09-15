import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { Table, TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { AcademicPermission } from '../../permissions/permission.model';
import { Faculty } from '../../models/faculty.model';
import { FacultyService } from '../../services/faculty.service';
import { AcademicCatalogService } from '../../services/academic-catalog.service';
import { DetailNavigationService } from '@/app/shared/navigation/detail-navigation.service';

@Component({
    selector: 'app-faculty-list',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        TableModule,
        ButtonModule,
        ToastModule,
        DialogModule,
        InputTextModule,
        IconFieldModule,
        InputIconModule,
        ContentSubtopbar
    ],
    templateUrl: './faculty-list.html',
    providers: [MessageService]
})
export class FacultyListPage implements OnInit {
    private readonly facultyService = inject(FacultyService);
    private readonly academicCatalog = inject(AcademicCatalogService);
    private readonly router = inject(Router);
    private readonly messageService = inject(MessageService);
    private readonly permissionService = inject(PermissionService);
    private readonly fb = inject(FormBuilder);
    private readonly detailNavigation = inject(DetailNavigationService);
    private readonly navigationScope = 'academic.faculties';

    readonly faculties = signal<Faculty[]>([]);
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly dialogVisible = signal(false);

    readonly form = this.fb.nonNullable.group({
        code: ['', Validators.required],
        name: ['', Validators.required]
    });

    readonly actions = computed<SubtopbarAction[]>(() => [
        {
            label: 'Nouvelle faculté',
            icon: 'pi pi-plus',
            severity: 'info',
            outlined: false,
            command: () => this.openCreateDialog(),
            permissions: [AcademicPermission.FacultyCreateAll],
            mode: 'any'
        }
    ]);

    ngOnInit(): void {
        this.load();
    }

    onGlobalFilter(table: Table, event: Event): void {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    openDetail(faculty: Faculty): void {
        void this.router.navigate(['/academic/faculties', faculty.id]);
    }

    openCreateDialog(): void {
        this.form.reset({ code: '', name: '' });
        this.dialogVisible.set(true);
    }

    closeDialog(): void {
        this.dialogVisible.set(false);
    }

    isInvalid(controlName: 'code' | 'name'): boolean {
        const control = this.form.controls[controlName];
        return control.invalid && (control.dirty || control.touched);
    }

    submit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const raw = this.form.getRawValue();
        const payload = { code: raw.code.trim(), name: raw.name.trim() };
        this.saving.set(true);

        this.facultyService.create(payload).subscribe({
            next: (faculty) => {
                this.saving.set(false);
                this.dialogVisible.set(false);
                this.academicCatalog.invalidateFaculties();
                this.load();
                this.showSuccess(`Faculté ${faculty.code} créée.`);
            },
            error: (error: HttpErrorResponse) => {
                this.saving.set(false);
                this.showError(error.error?.detail ?? 'Impossible d’enregistrer la faculté.');
            }
        });
    }

    private load(): void {
        this.loading.set(true);

        this.facultyService.getAll().subscribe({
            next: (faculties) => {
                const sorted = [...faculties].sort((a, b) => a.name.localeCompare(b.name));
                this.faculties.set(sorted);
                this.detailNavigation.setContext({
                    scope: this.navigationScope,
                    listRoute: ['/academic/faculties'],
                    page: 0,
                    size: sorted.length,
                    totalElements: sorted.length,
                    totalPages: 1,
                    items: sorted.map((faculty) => ({
                        id: faculty.id,
                        label: `${faculty.code} — ${faculty.name}`
                    }))
                });
                this.loading.set(false);
            },
            error: (error: HttpErrorResponse) => {
                this.faculties.set([]);
                this.loading.set(false);
                this.showError(error.error?.detail ?? 'Impossible de charger les facultés.');
            }
        });
    }

    private showSuccess(detail: string): void {
        this.messageService.add({ severity: 'success', summary: 'Succès', detail, life: 3000 });
    }

    private showError(detail: string): void {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail, life: 5000 });
    }
}