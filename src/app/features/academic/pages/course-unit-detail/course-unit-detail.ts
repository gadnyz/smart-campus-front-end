import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { AcademicPermission } from '../../permissions/permission.model';
import { Course, CourseRequest } from '../../models/course.model';
import { CourseUnit, UE_BLOC_OPTIONS } from '../../models/course-unit.model';
import { CourseService } from '../../services/course.service';
import { CourseUnitService } from '../../services/course-unit.service';

@Component({
    selector: 'app-course-unit-detail',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        TableModule,
        ButtonModule,
        ToastModule,
        DialogModule,
        SelectModule,
        ContentSubtopbar
    ],
    templateUrl: './course-unit-detail.html',
    providers: [MessageService]
})
export class CourseUnitDetailPage implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly courseUnitService = inject(CourseUnitService);
    private readonly courseService = inject(CourseService);
    private readonly permissionService = inject(PermissionService);
    private readonly messageService = inject(MessageService);
    private readonly fb = inject(FormBuilder);

    readonly unit = signal<CourseUnit | null>(null);
    readonly facultyCourses = signal<Course[]>([]);
    readonly loading = signal(false);
    readonly assignDialogVisible = signal(false);
    readonly moveDialogVisible = signal(false);
    readonly saving = signal(false);
    readonly movingCourse = signal<Course | null>(null);
    readonly otherUnits = signal<CourseUnit[]>([]);

    readonly attachedCourses = computed(() => {
        const unitId = this.unit()?.id;
        return this.facultyCourses().filter((course) => course.course_unit_id === unitId);
    });

    readonly availableCourses = computed(() => {
        const unitId = this.unit()?.id;
        return this.facultyCourses().filter((course) => course.course_unit_id !== unitId);
    });

    readonly totalCredits = computed(() =>
        this.attachedCourses().reduce((sum, course) => sum + (course.credits ?? 0), 0)
    );

    readonly canAssign = computed(() =>
        this.permissionService.hasAnyPermission([AcademicPermission.CourseUpdateAll])
    );

    readonly title = computed(() => {
        const unit = this.unit();
        return unit ? unit.code : 'UE';
    });

    readonly actions = computed<SubtopbarAction[]>(() => [
        {
            label: 'Retour',
            icon: 'pi pi-arrow-left',
            severity: 'secondary',
            outlined: true,
            command: () => void this.router.navigate(['/academic/course-units'])
        }
    ]);

    readonly assignForm = this.fb.nonNullable.group({
        course_id: [null as string | null, Validators.required]
    });

    readonly moveForm = this.fb.nonNullable.group({
        course_unit_id: [null as string | null, Validators.required]
    });

    readonly availableCourseOptions = computed(() =>
        this.availableCourses().map((course) => ({
            label: `${course.code} — ${course.name} (${course.credits} cr.)`,
            value: course.id
        }))
    );

    readonly otherUnitOptions = computed(() =>
        this.otherUnits().map((unit) => ({
            label: `${unit.code} — ${this.blocLabel(unit.knowledge_skills_bloc)}`,
            value: unit.id
        }))
    );

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');

        if (!id) {
            void this.router.navigate(['/notfound']);
            return;
        }

        this.loadUnit(id);
    }

    blocLabel(bloc: string): string {
        return UE_BLOC_OPTIONS.find((item) => item.value === bloc)?.label ?? bloc;
    }

    openAssign(): void {
        this.assignForm.reset({ course_id: null });
        this.assignDialogVisible.set(true);
    }

    submitAssign(): void {
        const unit = this.unit();
        const course = this.facultyCourses().find((item) => item.id === this.assignForm.controls.course_id.value);

        if (!unit || !course || this.assignForm.invalid) {
            this.assignForm.markAllAsTouched();
            return;
        }

        this.saving.set(true);
        this.courseService.update(course.id, this.toRequest(course, unit.id)).subscribe({
            next: () => {
                this.saving.set(false);
                this.assignDialogVisible.set(false);
                this.loadFacultyCourses(unit.faculty_id);
                this.showSuccess(`Cours ${course.code} affecté.`);
            },
            error: (error: HttpErrorResponse) => {
                this.saving.set(false);
                this.showError(error.error?.detail ?? 'Impossible d’affecter ce cours.');
            }
        });
    }

    openMove(course: Course): void {
        const unit = this.unit();

        if (!unit) {
            return;
        }

        this.movingCourse.set(course);
        this.moveForm.reset({ course_unit_id: null });
        this.courseUnitService.getByFaculty(unit.faculty_id).subscribe({
            next: (units) => {
                this.otherUnits.set(units.filter((item) => item.id !== unit.id));
                this.moveDialogVisible.set(true);
            }
        });
    }

    submitMove(): void {
        const course = this.movingCourse();
        const targetId = this.moveForm.controls.course_unit_id.value;
        const unit = this.unit();

        if (!course || !targetId || !unit) {
            this.moveForm.markAllAsTouched();
            return;
        }

        this.saving.set(true);
        this.courseService.update(course.id, this.toRequest(course, targetId)).subscribe({
            next: () => {
                this.saving.set(false);
                this.moveDialogVisible.set(false);
                this.movingCourse.set(null);
                this.loadFacultyCourses(unit.faculty_id);
                this.showSuccess(`Cours ${course.code} retiré de cette UE.`);
            },
            error: (error: HttpErrorResponse) => {
                this.saving.set(false);
                this.showError(error.error?.detail ?? 'Impossible de retirer ce cours.');
            }
        });
    }

    private loadUnit(id: string): void {
        this.loading.set(true);
        this.courseUnitService.getById(id).subscribe({
            next: (unit) => {
                this.unit.set(unit);
                this.loading.set(false);
                this.loadFacultyCourses(unit.faculty_id);
            },
            error: () => {
                this.loading.set(false);
                void this.router.navigate(['/notfound']);
            }
        });
    }

    private loadFacultyCourses(facultyId: string): void {
        this.courseService.getByFaculty(facultyId).subscribe({
            next: (courses) => this.facultyCourses.set(courses),
            error: (error: HttpErrorResponse) =>
                this.showError(error.error?.detail ?? 'Impossible de charger les cours.')
        });
    }

    private toRequest(course: Course, courseUnitId: string): CourseRequest {
        return {
            code: course.code,
            name: course.name,
            description: course.description,
            credits: course.credits,
            course_unit_id: courseUnitId
        };
    }

    private showSuccess(detail: string): void {
        this.messageService.add({ severity: 'success', summary: 'Succès', detail, life: 3000 });
    }

    private showError(detail: string): void {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail, life: 5000 });
    }
}
