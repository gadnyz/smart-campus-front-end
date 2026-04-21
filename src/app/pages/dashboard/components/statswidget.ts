import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    standalone: true,
    selector: 'app-stats-widget',
    imports: [CommonModule],
    template: `
        <div class="col-span-12 lg:col-span-6 xl:col-span-3">
            <div class="card mb-0">
                <div class="flex justify-between mb-4">
                    <div>
                        <span class="block text-muted-color font-medium mb-4">Utilisateurs</span>
                        <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">248</div>
                    </div>
                    <div class="flex items-center justify-center bg-blue-100 dark:bg-blue-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                        <i class="pi pi-users text-blue-500 text-xl!"></i>
                    </div>
                </div>
                <span class="text-primary font-medium">12 nouveaux </span>
                <span class="text-muted-color">ce mois-ci</span>
            </div>
        </div>

        <div class="col-span-12 lg:col-span-6 xl:col-span-3">
            <div class="card mb-0">
                <div class="flex justify-between mb-4">
                    <div>
                        <span class="block text-muted-color font-medium mb-4">Rôles</span>
                        <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">18</div>
                    </div>
                    <div class="flex items-center justify-center bg-cyan-100 dark:bg-cyan-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                        <i class="pi pi-id-card text-cyan-500 text-xl!"></i>
                    </div>
                </div>
                <span class="text-primary font-medium">3 actifs </span>
                <span class="text-muted-color">en administration</span>
            </div>
        </div>

        <div class="col-span-12 lg:col-span-6 xl:col-span-3">
            <div class="card mb-0">
                <div class="flex justify-between mb-4">
                    <div>
                        <span class="block text-muted-color font-medium mb-4">Privilèges</span>
                        <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">64</div>
                    </div>
                    <div class="flex items-center justify-center bg-orange-100 dark:bg-orange-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                        <i class="pi pi-lock text-orange-500 text-xl!"></i>
                    </div>
                </div>
                <span class="text-primary font-medium">8 critiques </span>
                <span class="text-muted-color">à surveiller</span>
            </div>
        </div>

        <div class="col-span-12 lg:col-span-6 xl:col-span-3">
            <div class="card mb-0">
                <div class="flex justify-between mb-4">
                    <div>
                        <span class="block text-muted-color font-medium mb-4">Profils métier</span>
                        <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">9</div>
                    </div>
                    <div class="flex items-center justify-center bg-purple-100 dark:bg-purple-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                        <i class="pi pi-briefcase text-purple-500 text-xl!"></i>
                    </div>
                </div>
                <span class="text-primary font-medium">2 nouveaux </span>
                <span class="text-muted-color">profils ajoutés</span>
            </div>
        </div>
    `
})
export class StatsWidget {}
