import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { Table } from 'primeng/table';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/services/auth.service';
import { DetailNavigationService } from '@/app/shared/navigation/detail-navigation.service';
import { Room } from '../../models/room.model';
import { RoomService } from '../../services/room.service';
import { RoomListPage } from './room-list';

describe('RoomListPage', () => {
    let component: RoomListPage;
    let fixture: ComponentFixture<RoomListPage>;
    let roomService: jasmine.SpyObj<RoomService>;
    let router: Router;

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

    // `DetailNavigationService` persiste son contexte dans sessionStorage : on le vide entre les
    // tests pour ne pas les rendre dépendants de l'ordre d'exécution (cf. `auth.guard.spec.ts`).
    beforeEach(() => sessionStorage.clear());
    afterEach(() => sessionStorage.clear());

    /**
     * Le vrai garde-fou de l'action « Nouvelle salle » est `ContentSubtopbar.visibleActions`, qui
     * filtre sur `action.permissions` : on interroge donc les boutons réellement rendus plutôt qu'un
     * `computed()` du composant, qui ne prouverait rien sur ce qui est affiché.
     */
    function renderedActionLabels(): string[] {
        return fixture.debugElement
            .queryAll(By.css('app-content-subtopbar button'))
            .map((button) => ((button.nativeElement as HTMLElement).textContent ?? '').trim());
    }

    async function createComponent(authorities: string[]): Promise<void> {
        roomService = jasmine.createSpyObj<RoomService>('RoomService', ['getAll', 'create']);
        roomService.getAll.and.returnValue(of(rooms));

        await TestBed.configureTestingModule({
            imports: [RoomListPage],
            providers: [
                provideRouter([]),
                DetailNavigationService,
                { provide: RoomService, useValue: roomService },
                {
                    provide: AuthService,
                    useValue: {
                        getCurrentUser: () => ({ id: 'admin', email: 'admin@unh.edu', authorities })
                    }
                }
            ]
        }).compileComponents();

        router = TestBed.inject(Router);
        spyOn(router, 'navigate');
        fixture = TestBed.createComponent(RoomListPage);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
    }

    it('should list rooms sorted by name', async () => {
        await createComponent(['scheduling:room:read:all']);
        expect(component.rooms().map((room) => room.name)).toEqual(['A101', 'Z201']);
    });

    it('should filter the loaded rooms by type without a new HTTP call', async () => {
        await createComponent(['scheduling:room:read:all']);
        component.onTypeFilterChange('LABORATORY');
        expect(component.filteredRooms().map((room) => room.id)).toEqual(['room-2']);
        expect(roomService.getAll).toHaveBeenCalledTimes(1);
    });

    it('should not render the create action without scheduling:room:create:all', async () => {
        await createComponent(['scheduling:room:read:all']);
        expect(renderedActionLabels()).not.toContain('Nouvelle salle');
    });

    it('should render the create action with scheduling:room:create:all', async () => {
        await createComponent(['scheduling:room:read:all', 'scheduling:room:create:all']);
        expect(renderedActionLabels()).toContain('Nouvelle salle');
    });

    it('should reset the table pagination when the type filter changes', async () => {
        await createComponent(['scheduling:room:read:all']);
        const table = fixture.debugElement.query(By.directive(Table)).componentInstance as Table;
        table.first = 10;

        component.onTypeFilterChange('LABORATORY', table);

        expect(table.first).toBe(0);
    });

    it('should navigate to the room detail', async () => {
        await createComponent(['scheduling:room:read:all']);
        component.openDetail(rooms[1]);
        expect(router.navigate).toHaveBeenCalledWith(['/scheduling/rooms', 'room-1']);
    });

    it('should create a room and reload the list', async () => {
        await createComponent(['scheduling:room:read:all', 'scheduling:room:create:all']);
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
        expect(roomService.getAll).toHaveBeenCalledTimes(2);
        expect(component.dialogVisible()).toBeFalse();
    });

    it('should not submit an invalid form', async () => {
        await createComponent(['scheduling:room:read:all', 'scheduling:room:create:all']);
        component.openCreateDialog();
        component.form.patchValue({ name: '' });
        component.submit();

        expect(roomService.create).not.toHaveBeenCalled();
        expect(component.form.controls.name.touched).toBeTrue();
    });

    it('should show an error and clear the list when loading fails', async () => {
        roomService = jasmine.createSpyObj<RoomService>('RoomService', ['getAll', 'create']);
        roomService.getAll.and.returnValue(throwError(() => ({ error: { detail: 'Erreur serveur' } })));

        await TestBed.configureTestingModule({
            imports: [RoomListPage],
            providers: [
                provideRouter([]),
                DetailNavigationService,
                { provide: RoomService, useValue: roomService },
                {
                    provide: AuthService,
                    useValue: { getCurrentUser: () => ({ id: 'admin', email: 'admin@unh.edu', authorities: [] }) }
                }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(RoomListPage);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();

        expect(component.rooms()).toEqual([]);
        expect(component.loading()).toBeFalse();
    });
});
