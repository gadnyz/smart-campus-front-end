import { CommonModule, Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
    selector: 'app-access',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule],
    template: `
        <div class="grid grid-cols-12">
            <div class="col-span-12 xl:col-span-8 xl:col-start-3">
                <div class="card flex flex-col items-center text-center gap-6 py-12 px-6">
                    <div
                        class="flex items-center justify-center rounded-full bg-orange-100 dark:bg-orange-400/10 text-orange-500"
                        style="width: 4.5rem; height: 4.5rem"
                    >
                        <i class="pi pi-lock text-3xl"></i>
                    </div>

                    <div>
                        <div class="text-primary font-semibold mb-2">403</div>

                        <h1 class="text-surface-900 dark:text-surface-0 font-semibold text-3xl mb-3">
                            Accès refusé
                        </h1>

                        <p class="text-color-secondary max-w-xl mx-auto leading-relaxed">
                            Vous ne disposez pas des permissions nécessaires pour accéder à cette page.
                            Si vous pensez qu’il s’agit d’une erreur, contactez un administrateur.
                        </p>
                    </div>

                </div>
            </div>
        </div>
    `
})
export class Access {
}