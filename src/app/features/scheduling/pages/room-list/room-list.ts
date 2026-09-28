import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputNumber } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { Table, TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { DetailNavigationService } from '@/app/shared/navigation/detail-navigation.service';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { SchedulingPermission } from '../../permissions/permission.model';
import { ROOM_TYPE_OPTIONS, Room, RoomType, roomTypeLabel } from '../../models/room.model';
import { RoomService } from '../../services/room.service';

@Component({
    selector: 'app-room-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        TableModule,
        ButtonModule,
        ToastModule,
        DialogModule,
        InputTextModule,
        InputNumber,
        SelectModule,
        IconFieldModule,
        InputIconModule,
        ContentSubtopbar
    ],
    templateUrl: './room-list.html',
    providers: [MessageService]
})
export class RoomListPage implements OnInit {
    private readonly roomService = inject(RoomService);
    private readonly router = inject(Router);
    private readonly messageService = inject(MessageService);
    private readonly permissionService = inject(PermissionService);
    private readonly fb = inject(FormBuilder);
    private readonly detailNavigation = inject(DetailNavigationService);
    private readonly navigationScope = 'scheduling.rooms';

    readonly rooms = signal<Room[]>([]);
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly dialogVisible = signal(false);
    readonly typeFilter = signal<RoomType | null>(null);

    readonly typeOptions = ROOM_TYPE_OPTIONS;
    readonly roomTypeLabel = roomTypeLabel;

    readonly filteredRooms = computed(() => {
        const type = this.typeFilter();
        const rooms = this.rooms();
        return type ? rooms.filter((room) => room.type === type) : rooms;
    });

    readonly canCreate = computed(() =>
        this.permissionService.hasAnyPermission([SchedulingPermission.RoomCreateAll])
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
            permissions: [SchedulingPermission.RoomCreateAll]
        }
    ]);

    ngOnInit(): void {
        this.load();
    }

    onGlobalFilter(table: Table, event: Event): void {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    onTypeFilterChange(type: RoomType | null): void {
        this.typeFilter.set(type);
    }

    openDetail(room: Room): void {
        void this.router.navigate(['/scheduling/rooms', room.id]);
    }

    openCreateDialog(): void {
        this.form.reset({ name: '', location: '', coordinates: '', capacity: 1, type: 'NORMAL', link: '' });
        this.dialogVisible.set(true);
    }

    closeDialog(): void {
        this.dialogVisible.set(false);
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
        this.saving.set(true);

        this.roomService
            .create({
                name: raw.name.trim(),
                location: raw.location.trim(),
                coordinates: raw.coordinates.trim() || null,
                capacity: raw.capacity,
                type: raw.type,
                link: raw.link.trim() || null
            })
            .subscribe({
                next: (room) => {
                    this.saving.set(false);
                    this.dialogVisible.set(false);
                    this.load();
                    this.showSuccess(`Salle ${room.name} créée.`);
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

    private load(): void {
        this.loading.set(true);

        this.roomService.getAll().subscribe({
            next: (rooms) => {
                const sorted = [...rooms].sort((a, b) => a.name.localeCompare(b.name));
                this.rooms.set(sorted);
                this.detailNavigation.setContext({
                    scope: this.navigationScope,
                    listRoute: ['/scheduling/rooms'],
                    page: 0,
                    size: sorted.length,
                    totalElements: sorted.length,
                    totalPages: 1,
                    items: sorted.map((room) => ({ id: room.id, label: room.name }))
                });
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
