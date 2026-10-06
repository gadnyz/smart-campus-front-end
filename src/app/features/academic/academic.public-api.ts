export * from './models/academic-reference.model';
export * from './services/academic-catalog.service';

export { asList, refId, refName } from './utils/academic-http';
export { toPaged } from './utils/academic-page';

/** `ProgramLevel.id` est le `program_level_id` attendu par Scheduling. Le catalogue public ne le porte pas. */
export type { Program, ProgramLevel } from './models/program.model';
export { ProgramService } from './services/program.service';

export type { Course } from './models/course.model';
export { CourseService } from './services/course.service';

export type { CourseAssignment } from './models/course-assignment.model';
export { CourseAssignmentService } from './services/course-assignment.service';