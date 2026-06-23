import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { CandidateService } from '../../services/candidate.service';

@Component({
    selector: 'app-candidate-stats-widget',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="card">
            <div class="text-color-secondary text-sm mb-2">Admission</div>
            <div class="text-3xl font-semibold">{{ totalCandidates() }}</div>
            <div class="text-color-secondary mt-2">Candidatures enregistrées</div>
        </div>
    `
})
export class CandidateStatsWidget implements OnInit {
    private readonly candidateService = inject(CandidateService);
    readonly totalCandidates = signal(0);

    ngOnInit(): void {
        this.candidateService.getAll({ page: 0, size: 1 }).subscribe({
            next: (response) => this.totalCandidates.set(response.total_elements),
            error: () => this.totalCandidates.set(0)
        });
    }
}