import { Component, input, output } from '@angular/core';
@Component({
    selector: 'app-dashboard-card',
    imports: [],
    templateUrl: './dashboard-card.html',
    styleUrl: './dashboard-card.scss'
})
export class DashboardCard {
    readonly interactive = input(false);
    readonly ariaLabel = input('');
    readonly activated = output<void>();

    emitActivation(): void {
        if (this.interactive()) {
            this.activated.emit();
        }
    }

    onKeydown(event: KeyboardEvent): void {
        if (!this.interactive()) {
            return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.activated.emit();
        }
    }
}
