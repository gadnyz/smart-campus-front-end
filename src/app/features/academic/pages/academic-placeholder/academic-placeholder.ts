import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-academic-placeholder',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="card">
            <div class="font-semibold text-xl mb-3">{{ title() }}</div>
            <p class="m-0 text-color-secondary">Page en préparation.</p>
        </div>
    `
})
export class AcademicPlaceholder {
    title = input('Module Academic');
}