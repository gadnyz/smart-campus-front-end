import { Component, inject } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';

@Component({
    selector: 'app-user-detail',
    standalone: true,
    imports: [ButtonModule, CardModule, TagModule, ContentSubtopbar],
    templateUrl: './user-detail.html',
    styleUrl: './user-detail.scss'
})
export class UserDetail {
    private readonly location = inject(Location);
    private readonly router = inject(Router);

    actions: SubtopbarAction[] = [
        {
            label: 'Retour',
            icon: 'pi pi-arrow-left',
            severity: 'secondary',
            outlined: true,
            command: () => this.goBack()
        },
        {
            label: 'Modifier',
            icon: 'pi pi-pencil',
            severity: 'info',
            outlined: false
        }
    ];

    goBack(): void {
        if (window.history.length > 1) {
            this.location.back();
            return;
        }

        void this.router.navigate(['/identity/users']);
    }
}
