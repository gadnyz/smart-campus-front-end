import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '@/app/core/auth/services/auth.service';
import { ContentSubtopbar } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { DetailNavigationService } from '@/app/shared/navigation/detail-navigation.service';
import { Course } from '../../models/course.model';
import { CourseAssignment, CourseAssignmentType } from '../../models/course-assignment.model';
import { CourseAssignmentService } from '../../services/course-assignment.service';
import { CourseService } from '../../services/course.service';
import { ProfessorService } from '../../services/professor.service';

interface AssignedCourseRow {
    assignment: CourseAssignment;
    course_id: string;
    code: string;
    name: string;
    role: CourseAssignmentType;
}

@Component({
    selector: 'app-my-courses',
    standalone: true,
    imports: [CommonModule, TableModule, ButtonModule, TagModule, ToastModule, ContentSubtopbar],
    templateUrl: './my-courses.html',
    providers: [MessageService]
})
export class MyCoursesPage implements OnInit {
    private readonly professorService = inject(ProfessorService);
    private readonly assignmentService = inject(CourseAssignmentService);
    private readonly courseService = inject(CourseService);
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);
    private readonly messageService = inject(MessageService);
    private readonly detailNavigation = inject(DetailNavigationService);
    private readonly navigationScope = 'academic.courses';

    readonly rows = signal<AssignedCourseRow[]>([]);
    readonly loading = signal(false);

    ngOnInit(): void {
        const session = this.authService.getCurrentUser();

        if (!session?.id && !session?.email) {
            void this.router.navigate(['/notfound']);
            return;
        }

        this.loading.set(true);
        this.professorService.resolveCurrent(session.id, session.email).subscribe({
            next: (professor) => {
                if (!professor) {
                    this.loading.set(false);
                    this.showError('Aucun profil professeur n’est associé à votre compte.');
                    return;
                }

                this.loadAssignments(professor.id);
            },
            error: (error: HttpErrorResponse) => {
                this.loading.set(false);
                this.showError(error.error?.detail ?? 'Impossible d’identifier le professeur connecté.');
            }
        });
    }

    typeLabel(type: CourseAssignmentType): string {
        return type === 'LEAD_INSTRUCTOR' ? 'Titulaire' : 'Assistant';
    }

    openDetail(row: AssignedCourseRow): void {
        void this.router.navigate(['/academic/courses', row.course_id]);
    }

    private loadAssignments(professorId: string): void {
        this.assignmentService.getByProfessor(professorId).subscribe({
            next: (assignments) => {
                const active = assignments.filter((item) => item.status !== 'INACTIVE');
                this.courseService.getAll().subscribe({
                    next: (courses) => this.afterRows(active, courses),
                    error: () => this.afterRows(active, [])
                });
            },
            error: (error: HttpErrorResponse) => {
                this.loading.set(false);
                this.showError(error.error?.detail ?? 'Impossible de charger vos cours.');
            }
        });
    }

    private afterRows(assignments: CourseAssignment[], courses: Course[]): void {
        const courseById = new Map(courses.map((course) => [course.id, course]));
        const rows = assignments
            .map((assignment) => {
                const course = courseById.get(assignment.course_id);
                return {
                    assignment,
                    course_id: assignment.course_id,
                    code: assignment.course_code || course?.code || assignment.course_id,
                    name: assignment.course_name || course?.name || 'Cours',
                    role: assignment.assignment_type
                };
            })
            .sort((left, right) => left.code.localeCompare(right.code));

        this.rows.set(rows);
        this.detailNavigation.setContext({
            scope: this.navigationScope,
            listRoute: ['/academic/my-courses'],
            page: 0,
            size: rows.length,
            totalElements: rows.length,
            totalPages: 1,
            items: rows.map((row) => ({
                id: row.course_id,
                label: `${row.code} — ${row.name}`
            }))
        });
        this.loading.set(false);
    }

    private showError(detail: string): void {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail, life: 5000 });
    }
}
