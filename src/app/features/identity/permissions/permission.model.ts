export const IdentityPermission = {
    UserReadAll : "identity:user:read:all",
    UserReadOwn : "identity:user:read:own",
    ProfileReadAll : "identity:profile:read:all",
    RoleReadAll : "identity:role:read:all",
    ProfileCreateAll : "identity:profile:create:all",
    ProfileUpdateAll : "identity:profile:update:all",
    RoleCreateAll : "identity:role:create:all",
    UserDeleteAll : "identity:user:delete:all",
    ApiManage : "identity:api:manage",
    ProfileDeleteAll : "identity:profile:delete:all",
    UserUpdateOwn : "identity:user:update:own",
    UserCreateAll : "identity:user:create:all",
    RoleDeleteAll : "identity:role:delete:all",
    UserUpdateAll : "identity:user:update:all",
    RoleUpdateAll: "identity:role:update:all",
    PrivilegeReadAll  : "identity:privilege:read:all"
} as const;
export type IdentityPermission =
    (typeof IdentityPermission)[keyof typeof IdentityPermission];