export const IdentityPermission = {
    ApiManage: 'identity:api:manage', 

    PrivilegeRead: 'identity:privilege:read', 
    PrivilegeManage: 'identity:privilege:manage', 

    ProfileManage: 'identity:profile:manage', 
    ProfileRead: 'identity:profile:read', 
    RoleManage: 'identity:role:manage', 
    RoleRead: 'identity:role:read', 


    UserRead: 'identity:user:read', 
    UserCreate: 'identity:user:create', 
    UserUpdate: 'identity:user:update', 
    UserDelete: 'identity:user:delete',
    UserManage : 'identity:user:manage', 

    UserReadOwn: 'identity:user:read:own', 
    UserUpdateOwn: 'identity:user:update:own' 
    
} as const;

export type IdentityPermission =
    (typeof IdentityPermission)[keyof typeof IdentityPermission];