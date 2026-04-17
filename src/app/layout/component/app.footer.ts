import { Component } from '@angular/core';
import { appBrand } from '@/app/core/config/app-brand';

@Component({
    standalone: true,
    selector: 'app-footer',
    template: `
        <div class="layout-footer">
            <span class="footer-app-name">{{ brand.appName }}</span>
            <span class="footer-separator">•</span>
            <span class="footer-tagline">{{ brand.footerTagline }}</span>
        </div>
    `
})
export class AppFooter {
    brand = appBrand;
}
