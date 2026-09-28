import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Table } from 'primeng/table';
import { Observable, of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/services/auth.service';
import { Room } from '../../../models/room.model';
import { RoomService } from '../../../services/room.service';
import { RoomsPage } from './rooms';

describe('RoomsPage (Paramètres › Planification)', () => {
    let component: RoomsPage;
    let fixture: ComponentFixture<RoomsPage>;
    let roomService: jasmine.SpyObj<RoomService>;
    let confirmationService: ConfirmationService;
    let messageService: MessageService;

    const rooms: Room[] = [
        {
            id: 'room-2',
            name: 'Z201',
            location: 'Bâtiment B',
            coordinates: null,
            capacity: 25,
            type: 'LABORATORY',
            link: null,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z'
        },
        {
            id: 'room-1',
            name: 'A101',
            location: 'Bâtiment A',
            coordinates: null,
            capacity: 40,
            type: 'NORMAL',
            link: null,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z'
        }
    ];

    /**
     * L'action « Nouvelle salle » est filtrée par `ContentSubtopbar.visibleActions` via
     * `action.permissions` : on interroge les boutons réellement rendus plutôt qu'un `computed()`,
     * qui ne prouverait rien sur ce qui est affiché.
     */
    function renderedActionLabels(): string[] {
        return fixture.debugElement
            .queryAll(By.css('app-content-subtopbar button'))
            .map((button) => ((button.nativeElement as HTMLElement).textContent ?? '').trim());
    }

    function rowButton(ariaLabel: string): HTMLElement | null {
        return (fixture.nativeElement as HTMLElement).querySelector(`button[aria-label="${ariaLabel}"]`);
    }

    async function createComponent(authorities: string[], getAll?: Observable<Room[]>): Promise<void> {
        roomService = jasmine.createSpyObj<RoomService>('RoomService', [
            'getAll',
            'create',
            'update',
            'delete'
        ]);
        roomService.getAll.and.returnValue(getAll ?? of(rooms));

        await TestBed.configureTestingModule({
            imports: [RoomsPage],
            providers: [
                provideRouter([]),
                { provide: RoomService, useValue: roomService },
                {
                    provide: AuthService,
                    useValue: {
                        getCurrentUser: () => ({ id: 'admin', email: 'admin@unh.edu', authorities })
                    }
                }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(RoomsPage);
        component = fixture.componentInstance;

        // RoomsPage déclare ses propres `providers: [ConfirmationService, MessageService]` : ces
        // jetons se résolvent via l'injecteur du composant, pas via TestBed.inject().
        confirmationService = fixture.debugElement.injector.get(ConfirmationService);
        messageService = fixture.debugElement.injector.get(MessageService);

        fixture.detectChanges();
        await fixture.whenStable();
    }

    it('should list rooms sorted by name', async () => {
        await createComponent(['scheduling:room:update:all']);
        expect(component.rooms().map((room) => room.name)).toEqual(['A101', 'Z201']);
    });

    it('should filter by type without a new HTTP call', async () => {
        await createComponent(['scheduling:room:update:all']);
        component.onTypeFilterChange('LABORATORY');

        expect(component.filteredRooms().map((room) => room.id)).toEqual(['room-2']);
        expect(roomService.getAll).toHaveBeenCalledTimes(1);
    });

    it('should reset the table pagination when the type filter changes', async () => {
        await createComponent(['scheduling:room:update:all']);
        const table = fixture.debugElement.query(By.directive(Table)).componentInstance as Table;
        table.first = 10;

        component.onTypeFilterChange('LABORATORY', table);

        expect(table.first).toBe(0);
    });

    it('should not render the create action without scheduling:room:create:all', async () => {
        await createComponent(['scheduling:room:update:all']);
        expect(renderedActionLabels()).not.toContain('Nouvelle salle');
    });

    it('should render the create action with scheduling:room:create:all', async () => {
        await createComponent(['scheduling:room:update:all', 'scheduling:room:create:all']);
        expect(renderedActionLabels()).toContain('Nouvelle salle');
    });

    it('should not render row edit/delete buttons without the matching permissions', async () => {
        await createComponent(['scheduling:room:read:all']);

        expect(rowButton('Modifier A101')).toBeNull();
        expect(rowButton('Supprimer A101')).toBeNull();
    });

    it('should render row edit/delete buttons with the matching permissions', async () => {
        await createComponent(['scheduling:room:update:all', 'scheduling:room:delete:all']);

        expect(rowButton('Modifier A101')).not.toBeNull();
        expect(rowButton('Supprimer A101')).not.toBeNull();
    });

    it('should create a room and reload the list', async () => {
        await createComponent(['scheduling:room:update:all', 'scheduling:room:create:all']);
        roomService.create.and.returnValue(of(rooms[1]));

        component.openCreateDialog();
        component.form.patchValue({ name: 'A101', location: 'Bâtiment A', capacity: 40, type: 'NORMAL' });
        component.submit();

        expect(roomService.create).toHaveBeenCalledWith({
            name: 'A101',
            location: 'Bâtiment A',
            coordinates: null,
            capacity: 40,
            type: 'NORMAL',
            link: null
        });
        expect(roomService.update).not.toHaveBeenCalled();
        expect(roomService.getAll).toHaveBeenCalledTimes(2);
        expect(component.dialogVisible()).toBeFalse();
    });

    it('should update the edited room instead of creating a new one', async () => {
        await createComponent(['scheduling:room:update:all']);
        const updated: Room = { ...rooms[1], capacity: 50 };
        roomService.update.and.returnValue(of(updated));

        component.openEditDialog(rooms[1]);
        expect(component.dialogTitle()).toBe('Modifier la salle');

        component.form.patchValue({ capacity: 50 });
        component.submit();

        expect(roomService.update).toHaveBeenCalledWith('room-1', {
            name: 'A101',
            location: 'Bâtiment A',
            coordinates: null,
            capacity: 50,
            type: 'NORMAL',
            link: null
        });
        expect(roomService.create).not.toHaveBeenCalled();
        expect(component.editingId()).toBeNull();
    });

    it('should not submit an invalid form', async () => {
        await createComponent(['scheduling:room:update:all', 'scheduling:room:create:all']);
        component.openCreateDialog();
        component.form.patchValue({ name: '' });
        component.submit();

        expect(roomService.create).not.toHaveBeenCalled();
        expect(component.form.controls.name.touched).toBeTrue();
    });

    it('should ask for confirmation and delete the room, then reload', async () => {
        await createComponent(['scheduling:room:update:all', 'scheduling:room:delete:all']);
        roomService.delete.and.returnValue(of(undefined));
        spyOn(confirmationService, 'confirm').and.callFake((confirmation) => {
            confirmation.accept?.();
            return confirmationService;
        });

        component.confirmDelete(rooms[1]);

        expect(roomService.delete).toHaveBeenCalledWith('room-1');
        expect(roomService.getAll).toHaveBeenCalledTimes(2);
    });

    it('should not delete the room while the confirmation dialog has not been accepted', async () => {
        await createComponent(['scheduling:room:update:all', 'scheduling:room:delete:all']);
        roomService.delete.and.returnValue(of(undefined));
        spyOn(confirmationService, 'confirm'); // n'invoque pas `accept`

        component.confirmDelete(rooms[1]);

        expect(roomService.delete).not.toHaveBeenCalled();
    });

    it('should surface the backend conflict message when deletion is blocked', async () => {
        await createComponent(['scheduling:room:update:all', 'scheduling:room:delete:all']);
        roomService.delete.and.returnValue(
            throwError(() => ({ status: 409, error: { detail: 'Salle utilisée par des séances planifiées.' } }))
        );
        spyOn(confirmationService, 'confirm').and.callFake((confirmation) => {
            confirmation.accept?.();
            return confirmationService;
        });
        spyOn(messageService, 'add');

        component.confirmDelete(rooms[1]);

        expect(messageService.add).toHaveBeenCalledWith(
            jasmine.objectContaining({ severity: 'error', detail: 'Salle utilisée par des séances planifiées.' })
        );
    });

    it('should fall back to a generic message on a 409 without a backend detail', async () => {
        await createComponent(['scheduling:room:update:all', 'scheduling:room:delete:all']);
        roomService.delete.and.returnValue(throwError(() => ({ status: 409, error: {} })));
        spyOn(confirmationService, 'confirm').and.callFake((confirmation) => {
            confirmation.accept?.();
            return confirmationService;
        });
        spyOn(messageService, 'add');

        component.confirmDelete(rooms[1]);

        expect(messageService.add).toHaveBeenCalledWith(
            jasmine.objectContaining({
                severity: 'error',
                detail: 'Cette salle est utilisée par des séances et ne peut pas être supprimée.'
            })
        );
    });

    it('should clear the list when loading fails', async () => {
        await createComponent(
            ['scheduling:room:update:all'],
            throwError(() => ({ error: { detail: 'Erreur serveur' } }))
        );

        expect(component.rooms()).toEqual([]);
        expect(component.loading()).toBeFalse();
    });
});
