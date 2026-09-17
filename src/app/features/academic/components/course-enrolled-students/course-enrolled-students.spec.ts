import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { Student } from '../../models/student.model';
import { StudentService } from '../../services/student.service';
import { CourseEnrolledStudents } from './course-enrolled-students';

describe('CourseEnrolledStudents', () => {
    let fixture: ComponentFixture<CourseEnrolledStudents>;
    let component: CourseEnrolledStudents;
    let studentService: jasmine.SpyObj<StudentService>;
    const students: Student[] = [
        {
            id: 'st-1',
            first_name: 'Ada',
            last_name: 'Lovelace',
            matricule: 'FST-001',
            program_name: 'Génie Logiciel',
            level_code: 'L1'
        }
    ];

    beforeEach(async () => {
        studentService = jasmine.createSpyObj<StudentService>('StudentService', ['getByCourse']);
        studentService.getByCourse.and.returnValue(of(students));

        await TestBed.configureTestingModule({
            imports: [CourseEnrolledStudents],
            providers: [{ provide: StudentService, useValue: studentService }]
        }).compileComponents();

        fixture = TestBed.createComponent(CourseEnrolledStudents);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('courseId', 'c-1');
        fixture.detectChanges();
        await fixture.whenStable();
    });

    it('should load enrolled students for the course', () => {
        expect(studentService.getByCourse).toHaveBeenCalledWith('c-1');
        expect(component.students().length).toBe(1);
        expect(component.studentName(students[0])).toBe('Lovelace Ada');
        expect(component.studentProgram(students[0])).toBe('Génie Logiciel');
        expect(component.studentLevel(students[0])).toBe('L1');
    });

    it('should ignore a missing students endpoint', async () => {
        studentService.getByCourse.and.returnValue(
            throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not Found' }))
        );
        fixture.componentRef.setInput('courseId', 'c-2');
        fixture.detectChanges();
        await fixture.whenStable();
        expect(component.students()).toEqual([]);
    });
});
