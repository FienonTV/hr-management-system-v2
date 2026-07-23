import "@auth/core/types";

declare module "@auth/core/types" {
  interface User {
    id: string;
    tenantId: string;
    isSystemAdmin: boolean;
  }

  interface Session {
    user: User;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    tenantId: string;
    isSystemAdmin: boolean;
  }
}
