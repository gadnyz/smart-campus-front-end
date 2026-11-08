import { CommonModule } from '@angular/common';
import { apiErrorMessage } from '@/app/shared/http/api-error';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ContentSubtopbar } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { DetailNavigationService } from '@/app/shared/navigation/detail-navigation.service';
import { CourseAssignment, CourseAssignmentType } from '../../models/course-assignment.model';
import { CourseAssignmentService } from '../../services/course-assignment.service';

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
    styleUrl: './my-courses.scss',
    providers: [MessageService]
})
export class MyCoursesPage implements OnInit {
    private readonly assignmentService = inject(CourseAssignmentService);
    private readonly router = inject(Router);
    private readonly messageService = inject(MessageService);
    private readonly detailNavigation = inject(DetailNavigationService);
    private readonly navigationScope = 'academic.courses';

    readonly rows = signal<AssignedCourseRow[]>([]);
    readonly loading = signal(false);

    ngOnInit(): void {
        this.loading.set(true);
        this.assignmentService.getMine().subscribe({
            next: (assignments) => this.afterRows(assignments.filter((item) => item.status !== 'INACTIVE')),
            error: (error: HttpErrorResponse) => {
                this.loading.set(false);
                this.showError(apiErrorMessage(error, 'Impossible de charger vos cours.'));
            }
        });
    }

    typeLabel(type: CourseAssignmentType): string {
        return type === 'LEAD_INSTRUCTOR' ? 'Titulaire' : 'Assistant';
    }

    openDetail(row: AssignedCourseRow): void {
        void this.router.navigate(['/academic/courses', row.course_id]);
    }

    private afterRows(assignments: CourseAssignment[]): void {
        const rows = assignments
            .map((assignment) => ({
                assignment,
                course_id: assignment.course_id,
                code: assignment.course_code || assignment.course_id,
                name: assignment.course_name || 'Cours',
                role: assignment.assignment_type
            }))
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
