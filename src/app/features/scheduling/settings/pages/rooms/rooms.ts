import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputNumber } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { Table, TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { SchedulingPermission } from '../../../permissions/permission.model';
import { ROOM_TYPE_OPTIONS, Room, RoomType, roomTypeLabel } from '../../../models/room.model';
import { RoomService } from '../../../services/room.service';

/**
 * Gestion des salles — onglet « Planification » des Paramètres, sur le modèle de
 * `academic/settings/pages/levels` : une seule page qui porte la liste, le dialogue de
 * création/modification et la confirmation de suppression (pas de page de détail).
 */
@Component({
    selector: 'app-scheduling-rooms',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        TableModule,
        ButtonModule,
        ToastModule,
        ConfirmDialogModule,
        DialogModule,
        InputTextModule,
        InputNumber,
        SelectModule,
        IconFieldModule,
        InputIconModule,
        ContentSubtopbar
    ],
    templateUrl: './rooms.html',
    providers: [ConfirmationService, MessageService]
})
export class RoomsPage implements OnInit {
    private readonly roomService = inject(RoomService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly messageService = inject(MessageService);
    private readonly permissionService = inject(PermissionService);
    private readonly fb = inject(FormBuilder);

    readonly rooms = signal<Room[]>([]);
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly dialogVisible = signal(false);
    readonly editingId = signal<string | null>(null);
    readonly typeFilter = signal<RoomType | null>(null);

    readonly typeOptions = ROOM_TYPE_OPTIONS;
    readonly roomTypeLabel = roomTypeLabel;

    readonly dialogTitle = computed(() => (this.editingId() ? 'Modifier la salle' : 'Nouvelle salle'));

    /** Filtrage client-side : `GET /api/v1/rooms` n'expose aucun paramètre de requête. */
    readonly filteredRooms = computed(() => {
        const type = this.typeFilter();
        const rooms = this.rooms();
        return type ? rooms.filter((room) => room.type === type) : rooms;
    });

    readonly canUpdate = computed(() =>
        this.permissionService.hasAnyPermission([SchedulingPermission.RoomUpdateAll])
    );

    readonly canDelete = computed(() =>
        this.permissionService.hasAnyPermission([SchedulingPermission.RoomDeleteAll])
    );

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
            label: 'Nouvelle salle',
            icon: 'pi pi-plus',
            severity: 'info',
            outlined: false,
            command: () => this.openCreateDialog(),
            permissions: [SchedulingPermission.RoomCreateAll],
            mode: 'any'
        }
    ]);

    ngOnInit(): void {
        this.load();
    }

    onGlobalFilter(table: Table, event: Event): void {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    /**
     * `table.first` doit être remis à zéro : sans cela, un filtrage effectué depuis la page 2+
     * laisse le tableau sur un offset désormais vide.
     */
    onTypeFilterChange(type: RoomType | null, table?: Table): void {
        this.typeFilter.set(type);

        if (table) {
            table.first = 0;
        }
    }

    openCreateDialog(): void {
        this.editingId.set(null);
        this.form.reset({ name: '', location: '', coordinates: '', capacity: 1, type: 'NORMAL', link: '' });
        this.dialogVisible.set(true);
    }

    openEditDialog(room: Room): void {
        this.editingId.set(room.id);
        this.form.reset({
            name: room.name,
            location: room.location,
            coordinates: room.coordinates ?? '',
            capacity: room.capacity,
            type: room.type,
            link: room.link ?? ''
        });
        this.dialogVisible.set(true);
    }

    closeDialog(): void {
        this.dialogVisible.set(false);
        this.editingId.set(null);
    }

    isInvalid(controlName: 'name' | 'location' | 'capacity' | 'type'): boolean {
        const control = this.form.controls[controlName];
        return control.invalid && (control.dirty || control.touched);
    }

    submit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const raw = this.form.getRawValue();
        const payload = {
            name: raw.name.trim(),
            location: raw.location.trim(),
            coordinates: raw.coordinates.trim() || null,
            capacity: raw.capacity,
            type: raw.type,
            link: raw.link.trim() || null
        };
        const editingId = this.editingId();
        this.saving.set(true);

        const request$ = editingId
            ? this.roomService.update(editingId, payload)
            : this.roomService.create(payload);

        request$.subscribe({
            next: (room) => {
                this.saving.set(false);
                this.dialogVisible.set(false);
                this.editingId.set(null);
                this.load();
                this.showSuccess(editingId ? `Salle ${room.name} modifiée.` : `Salle ${room.name} créée.`);
            },
            error: (error: HttpErrorResponse) => {
                this.saving.set(false);
                this.showError(
                    error.error?.detail ??
                        (error.status === 409
                            ? 'Une salle porte déjà ce nom.'
                            : 'Impossible d’enregistrer la salle.')
                );
            }
        });
    }

    confirmDelete(room: Room): void {
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
                this.load();
                this.showSuccess(`Salle ${room.name} supprimée.`);
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

    private load(): void {
        this.loading.set(true);

        this.roomService.getAll().subscribe({
            next: (rooms) => {
                this.rooms.set([...rooms].sort((a, b) => a.name.localeCompare(b.name)));
                this.loading.set(false);
            },
            error: (error: HttpErrorResponse) => {
                this.rooms.set([]);
                this.loading.set(false);
                this.showError(error.error?.detail ?? 'Impossible de charger les salles.');
            }
        });
    }

    private showSuccess(detail: string): void {
        this.messageService.add({ severity: 'success', summary: 'Succès', detail, life: 3000 });
    }

    private showError(detail: string): void {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail, life: 5000 });
    }
}
