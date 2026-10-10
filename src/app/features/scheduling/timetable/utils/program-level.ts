import { Program, ProgramLevel } from '@/app/features/academic/academic.public-api';

export function programLevelLabel(level: ProgramLevel): string {
    return level.is_common ? `${level.level.code} (commun)` : `${level.level.code} — ${level.level.name}`;
}

export function programLevelOptions(programs: readonly Program[], programId: string | null): { label: string; value: string }[] {
    const program = programs.find((item) => item.id === programId);
    return (program?.levels ?? []).map((level) => ({ label: programLevelLabel(level), value: level.id }));
}
