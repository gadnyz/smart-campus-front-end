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

export interface AppFeature {
    key: string;
    label: string;
    order?: number;
    route?: Route;
    menu?: FeatureMenuItem[];
    dashboardWidgets?: DashboardWidget[];
}