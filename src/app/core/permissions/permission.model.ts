export type PermissionMode = 'any' | 'all';

export type PermissionValue = string;

export interface PermissionCheck {
    permissions?: readonly PermissionValue[];
    mode?: PermissionMode;
}

export interface PermissionRouteData {
    permissions?: readonly PermissionValue[];
    mode?: PermissionMode;
}

export interface PermissionAwareItem {
    permissions?: readonly PermissionValue[];
    mode?: PermissionMode;
}