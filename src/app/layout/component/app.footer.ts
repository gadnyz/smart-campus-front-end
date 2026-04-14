import { Component } from '@angular/core';

@Component({
    standalone: true,
    selector: 'app-footer',
    template: `<div class="layout-footer">
        Smart Campus by
        <a href="https://www.unhorizons.org/" target="_blank" rel="noopener noreferrer" class="text-primary font-bold hover:underline">UNH</a>
    </div>`
})
export class AppFooter {}
