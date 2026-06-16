import { Component } from '@angular/core';
import { appBrand } from '@/app/core/config/app-brand';

@Component({
    standalone: true,
    selector: 'app-footer',
    template: `
        <div class="layout-footer desktop-footer">
            <div class="desktop-footer-left">
                <span class="desktop-footer-item footer-app-name">{{ brand.appName }}</span>
                <span class="desktop-footer-item">
                    <i class="pi pi-building-columns"></i>
                    <span>{{ brand.university }}</span>
                </span>
            </div>

            <!-- <div class="desktop-footer-right">
                <span class="desktop-footer-item">
                    <i class="pi pi-sync"></i>
                    <span>Synchronisé</span>
                </span>
                <span class="desktop-footer-item">
                    <i class="pi pi-shield"></i>
                    <span>Sécurisé</span>
                </span>
            </div> -->
        </div>
    `
})
export class AppFooter {
    brand = appBrand;
}
