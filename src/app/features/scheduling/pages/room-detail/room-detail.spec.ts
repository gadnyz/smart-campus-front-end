import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/services/auth.service';
import { DetailNavigationService } from '@/app/shared/navigation/detail-navigation.service';
import { Room } from '../../models/room.model';
import { RoomService } from '../../services/room.service';
import { RoomDetailPage } from './room-detail';

describe('RoomDetailPage', () => {
    let component: RoomDetailPage;
    let fixture: ComponentFixture<RoomDetailPage>;
    let roomService: jasmine.SpyObj<RoomService>;
    let confirmationService: ConfirmationService;
    let messageService: MessageService;
    let router: Router;
    const paramMap$ = new BehaviorSubject(convertToParamMap({ id: 'room-1' }));

    const room: Room = {
        id: 'room-1',
        name: 'A101',
        location: 'Bâtiment A',
        coordinates: null,
        capacity: 40,
        type: 'NORMAL',
        link: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z'
    };

    // `DetailNavigationService` persiste son contexte dans sessionStorage : sans ce nettoyage, le
    // contexte écrit par un test fuite vers le suivant et les tests deviennent dépendants de l'ordre
    // d'exécution (Jasmine le randomise). Même convention que `auth.guard.spec.ts`.
    beforeEach(() => sessionStorage.clear());
    afterEach(() => sessionStorage.clear());

    /**
     * Le vrai garde-fou des actions Modifier/Supprimer est `ContentSubtopbar.visibleActions`, qui
     * filtre sur `action.permissions`. Les tests doivent donc interroger les boutons réellement
     * rendus : asserter un `computed()` du composant laisserait passer une action dont la clé
     * `permissions` aurait été oubliée (le défaut M15 de l'audit).
     */
    function renderedActionLabels(): string[] {
        return fixture.debugElement
            .queryAll(By.css('app-content-subtopbar button'))
            .map((button) => ((button.nativeElement as HTMLElement).textContent ?? '').trim());
    }

    async function createComponent(
        authorities: string[],
        getById?: Observable<Room>,
        getAll?: Observable<Room[]>
    ): Promise<void> {
        roomService = jasmine.createSpyObj<RoomService>('RoomService', [
            'getById',
            'getAll',
            'update',
            'delete'
        ]);
        roomService.getById.and.returnValue(getById ?? of(room));
        roomService.getAll.and.returnValue(getAll ?? of([room]));

        await TestBed.configureTestingModule({
            imports: [RoomDetailPage],
            providers: [
                provideRouter([]),
                DetailNavigationService,
                { provide: RoomService, useValue: roomService },
                {
                    provide: ActivatedRoute,
                    useValue: { paramMap: paramMap$, snapshot: { paramMap: paramMap$.value } }
                },
                {
                    provide: AuthService,
                    useValue: { getCurrentUser: () => ({ id: 'admin', email: 'admin@unh.edu', authorities }) }
                }
            ]
        }).compileComponents();

        router = TestBed.inject(Router);
        spyOn(router, 'navigate');
        fixture = TestBed.createComponent(RoomDetailPage);
        component = fixture.componentInstance;

        // RoomDetailPage declares its own `providers: [ConfirmationService, MessageService]` (comme
        // faculty-detail.ts) : ces jetons doivent être résolus via l'injecteur du composant, pas via
        // TestBed.inject(), sinon on espionne une instance différente de celle réellement utilisée.
        confirmationService = fixture.debugElement.injector.get(ConfirmationService);
        messageService = fixture.debugElement.injector.get(MessageService);

        fixture.detectChanges();
        await fixture.whenStable();
    }

    it('should load the room from the route id', async () => {
        await createComponent(['scheduling:room:read:all']);
        expect(roomService.getById).toHaveBeenCalledWith('room-1');
        expect(component.room()).toEqual(room);
        expect(component.loading()).toBeFalse();
    });

    it('should not render update/delete actions without the matching permissions', async () => {
        await createComponent(['scheduling:room:read:all']);

        const labels = renderedActionLabels();

        expect(labels).toContain('Liste');
        expect(labels).not.toContain('Modifier');
        expect(labels).not.toContain('Supprimer');
    });

    it('should render update/delete actions with the matching permissions', async () => {
        await createComponent([
            'scheduling:room:read:all',
            'scheduling:room:update:all',
            'scheduling:room:delete:all'
        ]);

        const labels = renderedActionLabels();

        expect(labels).toContain('Modifier');
        expect(labels).toContain('Supprimer');
    });

    it('should navigate to notfound when the room does not exist', async () => {
        await createComponent(['scheduling:room:read:all'], throwError(() => ({ status: 404 })));

        expect(router.navigate).toHaveBeenCalledWith(['/notfound']);
    });

    it('should keep the user on the page and explain the failure on a server error', async () => {
        await createComponent(
            ['scheduling:room:read:all'],
            throwError(() => ({ status: 500, error: { detail: 'Panne serveur' } }))
        );

        // Un 500 n'est pas un « introuvable » : rediriger vers /notfound masquerait l'incident.
        expect(router.navigate).not.toHaveBeenCalledWith(['/notfound']);
        expect(component.room()).toBeNull();
        expect(component.loading()).toBeFalse();
        expect((fixture.nativeElement as HTMLElement).textContent).toContain('n’a pas pu être chargée');
    });

    it('should still display the room when the prev/next navigation context cannot be built', async () => {
        await createComponent(
            ['scheduling:room:read:all'],
            undefined,
            throwError(() => ({ status: 500 }))
        );

        expect(component.room()).toEqual(room);
        expect(component.navigationState()).toBeNull();
        expect(component.canGoPrevious()).toBeFalse();
        expect(component.canGoNext()).toBeFalse();
    });

    it('should update the room', async () => {
        await createComponent(['scheduling:room:read:all', 'scheduling:room:update:all']);
        const updated: Room = { ...room, name: 'A102', capacity: 50 };
        roomService.update.and.returnValue(of(updated));

        component.openEdit();
        component.form.patchValue({ name: 'A102', location: 'Bâtiment A', capacity: 50, type: 'NORMAL' });
        component.submit();

        expect(roomService.update).toHaveBeenCalledWith('room-1', {
            name: 'A102',
            location: 'Bâtiment A',
            coordinates: null,
            capacity: 50,
            type: 'NORMAL',
            link: null
        });
        expect(component.room()).toEqual(updated);
        expect(component.editDialogVisible()).toBeFalse();
    });

    it('should ask for confirmation and delete the room, then go back to the list', async () => {
        await createComponent(['scheduling:room:read:all', 'scheduling:room:delete:all']);
        roomService.delete.and.returnValue(of(undefined));
        spyOn(confirmationService, 'confirm').and.callFake((confirmation) => {
            confirmation.accept?.();
            return confirmationService;
        });

        component.confirmDelete();

        expect(confirmationService.confirm).toHaveBeenCalled();
        expect(roomService.delete).toHaveBeenCalledWith('room-1');
        expect(router.navigate).toHaveBeenCalledWith(['/scheduling/rooms']);
    });

    it('should not delete the room while the confirmation dialog has not been accepted', async () => {
        await createComponent(['scheduling:room:read:all', 'scheduling:room:delete:all']);
        roomService.delete.and.returnValue(of(undefined));
        spyOn(confirmationService, 'confirm'); // n'invoque pas `accept` : la boîte reste ouverte / est annulée

        component.confirmDelete();

        expect(roomService.delete).not.toHaveBeenCalled();
    });

    it('should surface the backend conflict message when deletion is blocked (room used by a scheduled session)', async () => {
        await createComponent(['scheduling:room:read:all', 'scheduling:room:delete:all']);
        roomService.delete.and.returnValue(
            throwError(() => ({ status: 409, error: { detail: 'Salle utilisée par des séances planifiées.' } }))
        );
        spyOn(confirmationService, 'confirm').and.callFake((confirmation) => {
            confirmation.accept?.();
            return confirmationService;
        });
        spyOn(messageService, 'add');

        component.confirmDelete();

        expect(messageService.add).toHaveBeenCalledWith(
            jasmine.objectContaining({ severity: 'error', detail: 'Salle utilisée par des séances planifiées.' })
        );
        expect(router.navigate).not.toHaveBeenCalledWith(['/scheduling/rooms']);
    });

    it('should fall back to a generic message on a 409 without a backend detail', async () => {
        await createComponent(['scheduling:room:read:all', 'scheduling:room:delete:all']);
        roomService.delete.and.returnValue(throwError(() => ({ status: 409, error: {} })));
        spyOn(confirmationService, 'confirm').and.callFake((confirmation) => {
            confirmation.accept?.();
            return confirmationService;
        });
        spyOn(messageService, 'add');

        component.confirmDelete();

        expect(messageService.add).toHaveBeenCalledWith(
            jasmine.objectContaining({
                severity: 'error',
                detail: 'Cette salle est utilisée par des séances et ne peut pas être supprimée.'
            })
        );
    });
});
