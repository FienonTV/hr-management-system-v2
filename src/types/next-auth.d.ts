import "@auth/core/types";

declare module "next-auth" {
  interface User {
    id: string;
    tenantId: string;
    externalId: string;
    isSystemAdmin: boolean;
    forcePasswordChange: boolean;
  }

  interface Session {
    user: User;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    tenantId: string;
    externalId: string;
    isSystemAdmin: boolean;
    forcePasswordChange: boolean;
  }
}
