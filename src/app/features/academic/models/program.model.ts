import { Level } from './level.model';

export interface ProgramLevel {
    level: Level;
    is_common: boolean;
}

export interface Program {
    id: string;
    name: string;
    code: string;
    faculty_id: string;
    faculty_name?: string;
    levels?: ProgramLevel[];
    created_at?: string;
    updated_at?: string;
}

export interface ProgramLevelRequest {
    level_id: string;
    is_common: boolean;
}

export interface ProgramRequest {
    code: string;
    name: string;
    faculty_id: string;
    levels: ProgramLevelRequest[];
}