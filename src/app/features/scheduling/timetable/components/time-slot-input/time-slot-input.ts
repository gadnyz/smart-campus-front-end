import { ChangeDetectionStrategy, Component, computed, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALIDATORS, NG_VALUE_ACCESSOR, ValidationErrors, Validator } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { formatSlot, minutesOf, parseTimeText, slotDate, slotOptions } from '../../utils/time-slots';

/**
 * Heure d'une séance, à la manière de Teams : une liste de créneaux de 30 minutes (8h00 à 20h00)
 * où l'on choisit, ou bien une saisie libre (« 8h45 », « 1015 »…). Pour l'heure de fin, `after`
 * limite la liste aux créneaux qui suivent le début et affiche la durée.
 *
 * <p>La valeur est une `Date` (seule l'heure compte), comme le reste du formulaire. Un texte qui
 * n'est pas une heure rend le contrôle invalide (`timeFormat`).
 */
@Component({
    selector: 'app-time-slot-input',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, SelectModule],
    providers: [
        { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TimeSlotInput), multi: true },
        { provide: NG_VALIDATORS, useExisting: forwardRef(() => TimeSlotInput), multi: true }
    ],
    template: `
        <p-select
            [inputId]="inputId()"
            [ngModel]="text()"
            (ngModelChange)="onText($event)"
            (onBlur)="onBlur()"
            [options]="options()"
            optionLabel="value"
            optionValue="value"
            [editable]="true"
            [disabled]="disabled()"
            [placeholder]="placeholder()"
            [invalid]="invalid()"
            scrollHeight="16rem"
            appendTo="body"
            class="w-full"
        >
            <ng-template #item let-option>
                <span class="tabular-nums">{{ option.value }}</span>
                @if (option.hint) {
                    <span class="ml-2 text-muted-color text-sm">{{ option.hint }}</span>
                }
            </ng-template>
        </p-select>
    `
})
export class TimeSlotInput implements ControlValueAccessor, Validator {
    readonly inputId = input<string>('');
    readonly placeholder = input<string>('hh:mm');
    /** Heure de début, pour la liste de l'heure de fin. */
    readonly after = input<Date | null>(null);
    readonly invalid = input(false);

    readonly text = signal<string | null>(null);
    readonly disabled = signal(false);
    readonly options = computed(() => {
        const after = this.after();
        return slotOptions(after ? minutesOf(after) : null);
    });

    private onChange: (value: Date | null) => void = () => undefined;
    private onTouched: () => void = () => undefined;
    private onValidatorChange: () => void = () => undefined;

    writeValue(value: Date | null): void {
        this.text.set(value ? formatSlot(minutesOf(value)) : null);
    }

    registerOnChange(fn: (value: Date | null) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    registerOnValidatorChange(fn: () => void): void {
        this.onValidatorChange = fn;
    }

    setDisabledState(disabled: boolean): void {
        this.disabled.set(disabled);
    }

    validate(): ValidationErrors | null {
        const text = this.text();
        return text && parseTimeText(text) === null ? { timeFormat: true } : null;
    }

    onText(value: string | null): void {
        this.text.set(value);
        const minutes = value ? parseTimeText(value) : null;
        this.onChange(minutes === null ? null : slotDate(minutes));
        this.onValidatorChange();
    }

    /** En quittant le champ, une heure saisie s'écrit comme dans la liste : « 8h3 » → « 08:30 ». */
    onBlur(): void {
        const text = this.text();
        const minutes = text ? parseTimeText(text) : null;
        if (minutes !== null) {
            this.text.set(formatSlot(minutes));
        }
        this.onTouched();
    }
}
