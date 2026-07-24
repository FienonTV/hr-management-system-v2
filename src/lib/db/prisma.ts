import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaAdmin?: PrismaClient;
};

function createPrismaClient(connectionString: string): PrismaClient {
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

function getClient(connectionStringEnvVar: string): PrismaClient {
  const connectionString = process.env[connectionStringEnvVar];
  if (!connectionString) {
    throw new Error(`${connectionStringEnvVar} is not set`);
  }

  return createPrismaClient(connectionString);
}

function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = getClient("DATABASE_URL");
  }
  return globalForPrisma.prisma;
}

function getPrismaAdmin(): PrismaClient {
  if (!globalForPrisma.prismaAdmin) {
    globalForPrisma.prismaAdmin = getClient("DIRECT_URL");
  }
  return globalForPrisma.prismaAdmin;
}

// Lazy app client backed by the restricted app DB user (hrms_app).
// It is subject to RLS and must only be used inside `withTenant`.
export const prisma = new Proxy(
  {} as PrismaClient,
  {
    get(_target, prop: PropertyKey) {
      const client = getPrisma() as unknown as Record<PropertyKey, unknown>;
      return client[prop];
    },
  }
);

// Lazy admin client backed by the unrestricted DB user (hrms_user).
// Use it only for authentication and other operations that cannot happen
// inside a single tenant context (e.g. cross-tenant lookups).
export const prismaAdmin = new Proxy(
  {} as PrismaClient,
  {
    get(_target, prop: PropertyKey) {
      const client = getPrismaAdmin() as unknown as Record<PropertyKey, unknown>;
      return client[prop];
    },
  }
);

export function disconnectPrisma(): Promise<void> {
  return Promise.all([
    globalForPrisma.prisma?.$disconnect() ?? Promise.resolve(),
    globalForPrisma.prismaAdmin?.$disconnect() ?? Promise.resolve(),
  ]).then(() => undefined);
}
