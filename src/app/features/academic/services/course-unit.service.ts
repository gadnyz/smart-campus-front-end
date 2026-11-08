import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@/environments/environment';
import { toApiParams } from '@/app/shared/http/api-params';
import {
    AttachCourseRequest,
    CourseUnit,
    CourseUnitCourse,
    CourseUnitDetail,
    CreateCourseUnitRequest,
    CurriculumEntry,
    KnowledgeSkillsBloc,
    UpdateCourseUnitRequest
} from '../models/course-unit.model';

@Injectable({ providedIn: 'root' })
export class CourseUnitService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/course-units`;

    /** Curriculum d'une promotion, éventuellement filtré sur un bloc. */
    getByProgramLevel(programLevelId: string, knowledgeSkillsBloc?: KnowledgeSkillsBloc): Observable<CourseUnit[]> {
        return this.http.get<CourseUnit[]>(`${this.baseUrl}/program-level/${programLevelId}`, {
            params: toApiParams({ knowledge_skills_bloc: knowledgeSkillsBloc })
        });
    }

    getById(id: string): Observable<CourseUnitDetail> {
        return this.http.get<CourseUnitDetail>(`${this.baseUrl}/${id}`);
    }

    create(payload: CreateCourseUnitRequest): Observable<CourseUnitDetail> {
        return this.http.post<CourseUnitDetail>(this.baseUrl, payload);
    }

    update(id: string, payload: UpdateCourseUnitRequest): Observable<CourseUnitDetail> {
        return this.http.put<CourseUnitDetail>(`${this.baseUrl}/${id}`, payload);
    }

    /** 409 si l'un de ses cours a encore des séances à venir. */
    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }

    /** Inscrit l'UE dans le curriculum d'une autre promotion de sa faculté (tronc commun), avec son bloc. */
    addToCurriculum(id: string, programLevelId: string, knowledgeSkillsBloc: KnowledgeSkillsBloc): Observable<CurriculumEntry> {
        return this.http.post<CurriculumEntry>(`${this.baseUrl}/${id}/program-levels/${programLevelId}`, { knowledge_skills_bloc: knowledgeSkillsBloc });
    }

    /** Retire l'UE d'une promotion ; 409 si l'un de ses cours y a encore des séances à venir. */
    removeFromCurriculum(id: string, programLevelId: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}/program-levels/${programLevelId}`);
    }

    /** Change le bloc de l'UE pour une promotion de son curriculum. */
    changeBloc(id: string, programLevelId: string, knowledgeSkillsBloc: KnowledgeSkillsBloc): Observable<CurriculumEntry> {
        return this.http.put<CurriculumEntry>(`${this.baseUrl}/${id}/program-levels/${programLevelId}`, {
            knowledge_skills_bloc: knowledgeSkillsBloc
        });
    }

    getCourses(id: string): Observable<CourseUnitCourse[]> {
        return this.http.get<CourseUnitCourse[]>(`${this.baseUrl}/${id}/courses`);
    }

    attachCourse(id: string, payload: AttachCourseRequest): Observable<CourseUnitCourse> {
        return this.http.post<CourseUnitCourse>(`${this.baseUrl}/${id}/courses`, payload);
    }

    /** 409 si le cours a encore des séances à venir pour une promotion de l'UE. */
    detachCourse(id: string, courseId: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}/courses/${courseId}`);
    }
}
