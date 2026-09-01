import { Type } from '@angular/core';
import { Route } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { PermissionAwareItem, PermissionMode, PermissionValue } from '@/app/core/permissions/permission.model';

export type DashboardWidgetSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface DashboardWidget {
    key: string;
    title: string;
    module: string;
    component: Type<unknown>;
    permissions?: readonly PermissionValue[];
    mode?: PermissionMode;
    size?: DashboardWidgetSize;
    order?: number;
}

export type FeatureMenuItem = Omit<MenuItem, 'items'> &
    PermissionAwareItem & {
        items?: FeatureMenuItem[];
        order?: number;
    };

/** Secondary links under a settings tab (Gmail-style section). */
export type SettingsTabItem = PermissionAwareItem & {
    label: string;
    routerLink: string[];
    icon?: string;
    order?: number;
};

/** Top-level horizontal tab inside Paramètres. */
export type SettingsTab = PermissionAwareItem & {
    key: string;
    label: string;
    /** Default route when the tab is selected. */
    routerLink: string[];
    order?: number;
    items?: SettingsTabItem[];
};

export interface AppFeature {
    key: string;
    label: string;
    order?: number;
    route?: Route;
    /** Operational sidebar menu (modules métier). */
    menu?: FeatureMenuItem[];
    /** Configuration tab under Paramètres (admins only). */
    settingsTab?: SettingsTab;
    /**
     * Lazy routes mounted under `/settings/{path}`.
     * Owned by the module (or CORE for system) — not by a central settings feature.
     */
    settingsRoute?: Route;
    dashboardWidgets?: DashboardWidget[];
}
