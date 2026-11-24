import { Pipe, PipeTransform } from '@angular/core';

/**
 * Libellés des niveaux et des promotions, les mêmes dans toute l'application.
 *
 * - Forme courte, par défaut : « L1 », « M2 », « L3 Génie Logiciel ».
 * - Forme longue, pour les documents officiels (impressions, PDF) et là où il y a de la place :
 *   « Licence 1 », « Licence 3 Génie Logiciel ».
 *
 * Un tronc commun n'est jamais signalé : il se reconnaît à son programme, sans filière à ce niveau.
 */
export type LabelForm = 'short' | 'long';

/** Ce que les écrans connaissent d'un niveau : son code, son nom, ou les deux. */
export interface LevelLike {
    code?: string | null;
    name?: string | null;
}

const CODE_FROM_NAME: readonly [RegExp, (match: RegExpExecArray) => string][] = [
    [/^licence\s*(\d+)$/i, (match) => `L${match[1]}`],
    [/^master\s*(\d+)$/i, (match) => `M${match[1]}`],
    [/^pr[ée]pa(ratoire)?$/i, () => 'PREPA']
];

/** « Licence 3 » → « L3 », quand l'API ne donne que le nom du niveau. */
function codeFromName(name: string): string {
    for (const [pattern, toCode] of CODE_FROM_NAME) {
        const match = pattern.exec(name.trim());
        if (match) {
            return toCode(match);
        }
    }
    return name.trim();
}

/** « L1 » (forme courte) ou « Licence 1 » (forme longue). */
export function levelLabel(level: LevelLike | null | undefined, form: LabelForm = 'short'): string {
    const code = level?.code?.trim();
    const name = level?.name?.trim();
    if (form === 'long') {
        return name || code || '';
    }
    return code || (name ? codeFromName(name) : '');
}

/** Une promotion : le niveau puis le programme, « L3 Génie Logiciel ». */
export function promotionLabel(level: LevelLike | null | undefined, programName: string | null | undefined, form: LabelForm = 'short'): string {
    return [levelLabel(level, form), programName?.trim()].filter(Boolean).join(' ');
}

/** `{{ level | levelLabel }}` ou `{{ level | levelLabel: 'long' }}`. */
@Pipe({ name: 'levelLabel' })
export class LevelLabelPipe implements PipeTransform {
    transform(level: LevelLike | null | undefined, form: LabelForm = 'short'): string {
        return levelLabel(level, form);
    }
}

/** `{{ level | promotionLabel: programName }}`. */
@Pipe({ name: 'promotionLabel' })
export class PromotionLabelPipe implements PipeTransform {
    transform(level: LevelLike | null | undefined, programName: string | null | undefined, form: LabelForm = 'short'): string {
        return promotionLabel(level, programName, form);
    }
}
