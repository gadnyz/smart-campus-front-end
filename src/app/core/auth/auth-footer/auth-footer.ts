import { Component, inject } from '@angular/core';
import { CoreSettingsStore } from '@/app/core/settings/services/core-settings.store';

@Component({
    selector: 'app-auth-footer',
    imports: [],
    templateUrl: './auth-footer.html',
    styleUrl: './auth-footer.scss'
})
export class AuthFooter {
    readonly brand = inject(CoreSettingsStore).brand;
}
