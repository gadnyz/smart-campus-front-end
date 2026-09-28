/**
 * Barrel des éléments partageables du module Scheduling (sur le modèle
 * d'`academic.public-api.ts`). Les autres modules important une ressource
 * Scheduling (ex. Timetables listant des salles) doivent passer par ce fichier
 * plutôt que par un chemin profond dans `features/scheduling/...`.
 */
export * from './models/room.model';
export * from './services/room.service';
