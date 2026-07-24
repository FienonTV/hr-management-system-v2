'use server';

import { withTenant } from "@/lib/db/tenant";
import { requirePermission } from "@/lib/permissions";
import type { User } from "@prisma/client";

export async function getUsersWithRoles(): Promise<(User & { roles: { id: string; name: string }[] })[]> {
  const { tenantId } = await requirePermission("users:read");
  return withTenant(tenantId, async (tx) => {
    const users = await tx.user.findMany({
      where: { tenantId },
      orderBy: { email: "asc" },
      include: {
        roles: {
          include: {
            role: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return users.map((user) => ({
      ...user,
      roles: user.roles.map((ur) => ur.role),
    }));
  });
}
