import { Injectable } from '@angular/core';

export interface DetailNavigationItem {
    id: string;
    label?: string;
}

export interface DetailNavigationContext {
    scope: string;
    listRoute: string[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    items: DetailNavigationItem[];
    filters?: Record<string, string | number | boolean | null | undefined>;
    updatedAt?: number;
}

export interface DetailNavigationState {
    context: DetailNavigationContext;
    localIndex: number;
    absoluteIndex: number;
    totalElements: number;
    label: string;
    hasPrevious: boolean;
    hasNext: boolean;
}

@Injectable({ providedIn: 'root' })
export class DetailNavigationService {
    private readonly storageKey = 'smartcampus.detail-navigation';

    setContext(context: DetailNavigationContext): void {
        const contexts = this.readAll();

        contexts[context.scope] = {
            ...context,
            updatedAt: Date.now()
        };

        this.writeAll(contexts);
    }

    getContext(scope: string): DetailNavigationContext | null {
        return this.readAll()[scope] ?? null;
    }

    getState(scope: string, id: string): DetailNavigationState | null {
        const context = this.getContext(scope);

        if (!context) {
            return null;
        }

        const localIndex = context.items.findIndex((item) => item.id === id);

        if (localIndex < 0) {
            return null;
        }

        const totalElements = Math.max(context.totalElements, context.items.length);
        const absoluteIndex = context.page * context.size + localIndex;

        return {
            context,
            localIndex,
            absoluteIndex,
            totalElements,
            label: `${absoluteIndex + 1}/${totalElements}`,
            hasPrevious: absoluteIndex > 0,
            hasNext: absoluteIndex + 1 < totalElements
        };
    }

    clear(scope: string): void {
        const contexts = this.readAll();
        delete contexts[scope];
        this.writeAll(contexts);
    }

    private readAll(): Record<string, DetailNavigationContext> {
        try {
            return JSON.parse(sessionStorage.getItem(this.storageKey) ?? '{}');
        } catch {
            return {};
        }
    }

    private writeAll(contexts: Record<string, DetailNavigationContext>): void {
        sessionStorage.setItem(this.storageKey, JSON.stringify(contexts));
    }
}