import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputNumber } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { DetailNavigationService, DetailNavigationState } from '@/app/shared/navigation/detail-navigation.service';
import { SchedulingPermission } from '../../permissions/permission.model';
import { ROOM_TYPE_OPTIONS, Room, RoomType, roomTypeLabel } from '../../models/room.model';
import { RoomService } from '../../services/room.service';

@Component({
    selector: 'app-room-detail',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        ButtonModule,
        CardModule,
        ToastModule,
        ConfirmDialogModule,
        DialogModule,
        InputTextModule,
        InputNumber,
        SelectModule,
        SkeletonModule,
        ContentSubtopbar
    ],
    templateUrl: './room-detail.html',
    providers: [ConfirmationService, MessageService]
})
export class RoomDetailPage implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);
    private readonly roomService = inject(RoomService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly messageService = inject(MessageService);
    private readonly fb = inject(FormBuilder);
    private readonly detailNavigation = inject(DetailNavigationService);
    private readonly navigationScope = 'scheduling.rooms';

    readonly room = signal<Room | null>(null);
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly editDialogVisible = signal(false);
    readonly navigationState = signal<DetailNavigationState | null>(null);

    readonly typeOptions = ROOM_TYPE_OPTIONS;
    readonly roomTypeLabel = roomTypeLabel;

    readonly canGoPrevious = computed(() => this.navigationState()?.hasPrevious ?? false);
    readonly canGoNext = computed(() => this.navigationState()?.hasNext ?? false);

    readonly title = computed(() => {
        const room = this.room();
        const name = room ? room.name : 'Salle';
        const position = this.navigationState()?.label;

        return position ? `${name} (${position})` : name;
    });

    readonly form = this.fb.nonNullable.group({
        name: ['', Validators.required],
        location: ['', Validators.required],
        coordinates: [''],
        capacity: [1, [Validators.required, Validators.min(1)]],
        type: ['NORMAL' as RoomType, Validators.required],
        link: ['']
    });

    readonly actions = computed<SubtopbarAction[]>(() => [
        {
            label: 'Liste',
            icon: 'pi pi-list',
            severity: 'secondary',
            outlined: false,
            command: () => void this.router.navigate(['/scheduling/rooms'])
        },
        {
            label: 'Précédent',
            icon: 'pi pi-chevron-left',
            severity: 'secondary',
            disabled: !this.canGoPrevious() || this.loading(),
            command: () => this.goToPreviousRoom()
        },
        {
            label: 'Suivant',
            icon: 'pi pi-chevron-right',
            severity: 'secondary',
            disabled: !this.canGoNext() || this.loading(),
            command: () => this.goToNextRoom()
        },
        {
            label: 'Modifier',
            icon: 'pi pi-pencil',
            command: () => this.openEdit(),
            permissions: [SchedulingPermission.RoomUpdateAll]
        },
        {
            label: 'Supprimer',
            icon: 'pi pi-trash',
            severity: 'danger',
            outlined: true,
            command: () => this.confirmDelete(),
            permissions: [SchedulingPermission.RoomDeleteAll]
        }
    ]);

    ngOnInit(): void {
        this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
            const id = params.get('id');

            if (!id) {
                this.goToNotFound();
                return;
            }

            this.syncNavigation(id);
            this.loadRoom(id);
        });
    }

    openEdit(): void {
        const room = this.room();

        if (!room) {
            return;
        }

        this.form.reset({
            name: room.name,
            location: room.location,
            coordinates: room.coordinates ?? '',
            capacity: room.capacity,
            type: room.type,
            link: room.link ?? ''
        });
        this.editDialogVisible.set(true);
    }

    closeEdit(): void {
        this.editDialogVisible.set(false);
    }

    isInvalid(controlName: 'name' | 'location' | 'capacity' | 'type'): boolean {
        const control = this.form.controls[controlName];
        return control.invalid && (control.dirty || control.touched);
    }

    submit(): void {
        const room = this.room();

        if (!room || this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const raw = this.form.getRawValue();
        this.saving.set(true);

        this.roomService
            .update(room.id, {
                name: raw.name.trim(),
                location: raw.location.trim(),
                coordinates: raw.coordinates.trim() || null,
                capacity: raw.capacity,
                type: raw.type,
                link: raw.link.trim() || null
            })
            .subscribe({
                next: (updated) => {
                    this.saving.set(false);
                    this.editDialogVisible.set(false);
                    this.room.set(updated);
                    this.refreshNavigationLabel(updated);
                    this.showSuccess(`Salle ${updated.name} modifiée.`);
                },
                error: (error: HttpErrorResponse) => {
                    this.saving.set(false);
                    this.showError(
                        error.error?.detail ??
                            (error.status === 409 ? 'Une salle porte déjà ce nom.' : 'Impossible de modifier la salle.')
                    );
                }
            });
    }

    confirmDelete(): void {
        const room = this.room();

        if (!room) {
            return;
        }

        this.confirmationService.confirm({
            header: 'Supprimer la salle',
            message: `Supprimer ${room.name} — ${room.location} ?`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Supprimer',
            rejectLabel: 'Annuler',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-text',
            accept: () => this.delete(room)
        });
    }

    private delete(room: Room): void {
        this.roomService.delete(room.id).subscribe({
            next: () => {
                this.showSuccess(`Salle ${room.name} supprimée.`);
                void this.router.navigate(['/scheduling/rooms']);
            },
            error: (error: HttpErrorResponse) => {
                this.showError(
                    error.error?.detail ??
                        (error.status === 409
                            ? 'Cette salle est utilisée par des séances et ne peut pas être supprimée.'
                            : 'Impossible de supprimer cette salle.')
                );
            }
        });
    }

    private loadRoom(id: string): void {
        this.loading.set(true);

        this.roomService.getById(id).subscribe({
            next: (room) => {
                this.room.set(room);
                this.loading.set(false);
            },
            error: (error: HttpErrorResponse) => {
                this.loading.set(false);

                // Seul un 404 signifie « cette salle n'existe pas ». Rediriger vers /notfound sur
                // n'importe quelle erreur (cf. `faculty-detail.ts:247`) masquerait une panne serveur
                // ou un refus d'autorisation derrière un faux « introuvable ».
                if (error.status === 404) {
                    this.goToNotFound();
                    return;
                }

                this.room.set(null);
                this.showError(error.error?.detail ?? 'Impossible de charger cette salle.');
            }
        });
    }

    private syncNavigation(id: string): void {
        const state = this.detailNavigation.getState(this.navigationScope, id);
        this.navigationState.set(state);

        if (state) {
            return;
        }

        this.roomService.getAll().subscribe({
            next: (rooms) => {
                const sorted = [...rooms].sort((a, b) => a.name.localeCompare(b.name));
                this.detailNavigation.setContext({
                    scope: this.navigationScope,
                    listRoute: ['/scheduling/rooms'],
                    page: 0,
                    size: sorted.length,
                    totalElements: sorted.length,
                    totalPages: 1,
                    items: sorted.map((item) => ({ id: item.id, label: item.name }))
                });
                this.navigationState.set(this.detailNavigation.getState(this.navigationScope, id));
            },
            error: () => {
                this.navigationState.set(null);
                this.showError('Impossible de préparer la navigation entre les salles.');
            }
        });
    }

    private refreshNavigationLabel(room: Room): void {
        const context = this.detailNavigation.getContext(this.navigationScope);

        if (!context) {
            this.syncNavigation(room.id);
            return;
        }

        this.detailNavigation.setContext({
            ...context,
            items: context.items.map((item) => (item.id === room.id ? { id: room.id, label: room.name } : item))
        });
        this.navigationState.set(this.detailNavigation.getState(this.navigationScope, room.id));
    }

    private goToPreviousRoom(): void {
        const state = this.navigationState();

        if (!state?.hasPrevious) {
            return;
        }

        const previous = state.context.items[state.localIndex - 1];

        if (previous) {
            void this.router.navigate(['/scheduling/rooms', previous.id]);
        }
    }

    private goToNextRoom(): void {
        const state = this.navigationState();

        if (!state?.hasNext) {
            return;
        }

        const next = state.context.items[state.localIndex + 1];

        if (next) {
            void this.router.navigate(['/scheduling/rooms', next.id]);
        }
    }

    private goToNotFound(): void {
        void this.router.navigate(['/notfound']);
    }

    private showSuccess(detail: string): void {
        this.messageService.add({ severity: 'success', summary: 'Succès', detail, life: 3000 });
    }

    private showError(detail: string): void {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail, life: 5000 });
    }
}
