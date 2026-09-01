import { Component, inject } from '@angular/core';
import { CoreSettingsStore } from '@/app/core/settings/services/core-settings.store';

@Component({
    standalone: true,
    selector: 'app-footer',
    template: `
        <div class="layout-footer desktop-footer">
            <div class="desktop-footer-left">
                <span class="desktop-footer-item footer-app-name">{{ brand().appName }}</span>
                <span class="desktop-footer-item">
                    <i class="pi pi-building-columns"></i>
                    <span>{{ brand().university }}</span>
                </span>
            </div>
        </div>
    `
})
export class AppFooter {
    readonly brand = inject(CoreSettingsStore).brand;
}
