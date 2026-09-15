export interface Level {
    id: string;
    name: string;
    code: string;
    level_order: number;
    created_at?: string;
    updated_at?: string;
}

export interface LevelRequest {
    code: string;
    name: string;
    order: number;
}