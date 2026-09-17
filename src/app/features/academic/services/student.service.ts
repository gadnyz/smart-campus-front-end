import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '@/environments/environment';
import { Student } from '../models/student.model';

@Injectable({ providedIn: 'root' })
export class StudentService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/students`;

    getByCourse(courseId: string): Observable<Student[]> {
        return this.http
            .get<Student[] | { content?: Student[] }>(`${this.baseUrl}/course/${courseId}`)
            .pipe(map(asList));
    }
}

function asList<T>(body: T[] | { content?: T[] } | null | undefined): T[] {
    if (Array.isArray(body)) {
        return body;
    }

    return body?.content ?? [];
}
