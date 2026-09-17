import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { TableModule } from 'primeng/table';
import { Student, studentDisplayName } from '../../models/student.model';
import { StudentService } from '../../services/student.service';

@Component({
    selector: 'app-course-enrolled-students',
    standalone: true,
    imports: [CommonModule, TableModule],
    templateUrl: './course-enrolled-students.html'
})
export class CourseEnrolledStudents {
    private readonly studentService = inject(StudentService);

    readonly courseId = input<string | null | undefined>(undefined);
    readonly loadError = output<string>();

    readonly students = signal<Student[]>([]);
    readonly loading = signal(false);

    constructor() {
        effect(() => {
            const courseId = this.courseId();
            untracked(() => this.load(courseId));
        });
    }

    studentName(student: Student): string {
        return studentDisplayName(student);
    }

    studentProgram(student: Student): string {
        return student.program_name || student.program_code || '—';
    }

    studentLevel(student: Student): string {
        return student.level_code || student.level_name || '—';
    }

    private load(courseId: string | null | undefined): void {
        if (!courseId) {
            this.students.set([]);
            this.loading.set(false);
            return;
        }

        this.loading.set(true);
        this.studentService.getByCourse(courseId).subscribe({
            next: (students) => {
                this.students.set(students);
                this.loading.set(false);
            },
            error: (error: HttpErrorResponse) => {
                this.students.set([]);
                this.loading.set(false);
                if (error.status !== 404) {
                    this.loadError.emit(error.error?.detail ?? 'Impossible de charger les étudiants inscrits.');
                }
            }
        });
    }
}
