import { Type } from '@angular/core';
import { PermissionMode, PermissionValue } from '@/app/core/permissions/permission.model';


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