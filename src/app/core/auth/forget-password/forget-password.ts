import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { appBrand } from '@/app/core/config/app-brand';
import { AuthFooter } from "../auth-footer/auth-footer";

@Component({
    selector: 'app-forget-password',
    standalone: true,
    imports: [FormsModule, RouterModule, ButtonModule, InputTextModule, MessageModule, AuthFooter],
    templateUrl: './forget-password.html',
    styleUrl: '../login.scss'
})

export class forgetPassword {
    brand = appBrand;

    email = '';
    loading = signal(false);
    successMessage = signal('');
    errorMessage = signal('');

    submit(form: HTMLFormElement): void {
        this.successMessage.set('');
        this.errorMessage.set('');

        if (!form.reportValidity()) {
            return;
        }

        this.loading.set(true);

        // À brancher ensuite sur l’API forget-password.
        setTimeout(() => {
            this.loading.set(false);
            this.successMessage.set("Si cette adresse existe, un lien de récupération sera envoyé. Si vous n'avez pas reçu d'e-mail, vérifiez votre dossier de courrier indésirable.");
        }, 600);
    }
}
