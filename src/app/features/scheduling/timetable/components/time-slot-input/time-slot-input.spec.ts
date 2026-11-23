import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TimeSlotInput } from './time-slot-input';

@Component({
    standalone: true,
    imports: [ReactiveFormsModule, TimeSlotInput],
    template: `<app-time-slot-input inputId="start" [formControl]="control" />`
})
class Host {
    readonly control = new FormControl<Date | null>(null);
}

describe('TimeSlotInput', () => {
    function setup() {
        const fixture = TestBed.createComponent(Host);
        fixture.detectChanges();
        const input = (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;
        const type = (text: string) => {
            input.value = text;
            input.dispatchEvent(new Event('input'));
            fixture.detectChanges();
        };
        return { fixture, input, type, control: fixture.componentInstance.control };
    }

    it('should turn a typed hour into a time', () => {
        const { type, control } = setup();
        type('8h45');
        expect(control.value?.getHours()).toBe(8);
        expect(control.value?.getMinutes()).toBe(45);
        expect(control.valid).toBeTrue();
    });

    it('should be invalid while the text is not an hour', () => {
        const { type, control } = setup();
        type('midi');
        expect(control.value).toBeNull();
        expect(control.hasError('timeFormat')).toBeTrue();
    });

    it('should show the time of the form value', async () => {
        const { fixture, input } = setup();
        fixture.componentInstance.control.setValue(new Date(1970, 0, 1, 14, 30));
        fixture.detectChanges();
        // ngModel applique la valeur de façon asynchrone.
        await fixture.whenStable();
        fixture.detectChanges();
        expect(input.value).toBe('14:30');
    });
});
