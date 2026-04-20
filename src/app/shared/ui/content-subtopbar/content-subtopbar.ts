import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';

 export type SubtopbarAction = {
    label: string;
    icon?: string;
    severity?: 'secondary' | 'contrast' | 'success' | 'info' | 'warn' | 'help' | 'danger';
    outlined?: boolean;
    text?: boolean;
    routerLink?: string | string[];
    command?: () => void;
};

@Component({
    selector: 'app-content-subtopbar',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule],
    templateUrl: './content-subtopbar.html',
    styleUrl: './content-subtopbar.scss',
})

export class ContentSubtopbar {
    kicker = input('Module');
    title = input('Vue');
    actions = input<SubtopbarAction[]>([]);
}