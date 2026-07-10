import { Component } from '@angular/core';
import { appBrand } from '../../config/app-brand';

@Component({
    selector: 'app-auth-footer',
    imports: [],
    templateUrl: './auth-footer.html',
    styleUrl: './auth-footer.scss'
})
export class AuthFooter {
    brand = appBrand;
}
