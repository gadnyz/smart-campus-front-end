/**
 * Modèles alignés strictement sur le schéma OpenAPI de la « Scheduling Rest API »
 * (`RoomResponse`, `CreateRoomRequest`, `UpdateRoomRequest`), vérifié sur le backend
 * local le 28/09/2026 — voir /v3/api-docs/Scheduling%20Rest%20API.
 *
 * GET /api/v1/rooms renvoie un tableau plat (`RoomResponse[]`), sans pagination ni
 * paramètre de requête : il n'y a donc pas de `PagedResponse<Room>` ici.
 */
export type RoomType = 'ONLINE' | 'OFFICE' | 'LABORATORY' | 'NORMAL';

export interface Room {
    id: string;
    name: string;
    location: string;
    /** Repère libre (bâtiment, étage…) ; optionnel côté backend. */
    coordinates: string | null;
    capacity: number;
    type: RoomType;
    /** Lien de visioconférence — pertinent uniquement pour les salles ONLINE. */
    link: string | null;
    created_at: string;
    updated_at: string;
}

export interface RoomRequest {
    name: string;
    location: string;
    coordinates?: string | null;
    capacity: number;
    type: RoomType;
    link?: string | null;
}

export const ROOM_TYPE_OPTIONS: { label: string; value: RoomType }[] = [
    { label: 'Standard', value: 'NORMAL' },
    { label: 'En ligne', value: 'ONLINE' },
    { label: 'Bureau', value: 'OFFICE' },
    { label: 'Laboratoire', value: 'LABORATORY' }
];

export function roomTypeLabel(type: RoomType | string | null | undefined): string {
    return ROOM_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? (type ?? '—');
}
