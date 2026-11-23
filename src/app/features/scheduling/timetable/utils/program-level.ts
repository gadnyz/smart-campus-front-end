import { Program, ProgramLevel } from '@/app/features/academic/academic.public-api';

/**
 * « L1 » : le code suffit, son nom (« Licence 1 ») le répète. Un tronc commun n'est pas signalé :
 * il se reconnaît à son programme, qui n'a pas de filière à ce niveau.
 */
export function programLevelLabel(level: ProgramLevel): string {
    return level.level.code;
}

export function programLevelOptions(programs: readonly Program[], programId: string | null): { label: string; value: string }[] {
    const program = programs.find((item) => item.id === programId);
    return (program?.levels ?? []).map((level) => ({ label: programLevelLabel(level), value: level.id }));
}
