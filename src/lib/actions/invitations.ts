'use server';

import { randomBytes, createHash } from "crypto";
import { withTenant } from "@/lib/db/tenant";
import { prismaAdmin } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { hashPassword, validatePassword } from "@/lib/passwordPolicy";

const INVITATION_TOKEN_BYTES = 32;
const INVITATION_EXPIRY_HOURS = 48;

export interface CreateInvitationInput {
  email: string;
  roleIds: string[];
  employeeId?: string;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createInvitation(input: CreateInvitationInput): Promise<{ success: boolean; error?: string; invitationId?: string; token?: string }> {
  const { tenantId, session } = await requirePermission("users:invite");

  const email = input.email.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Ungültige E-Mail-Adresse" };
  }

  return withTenant(tenantId, async (tx) => {
    const existingUser = await tx.user.findUnique({
      where: { tenantId_email: { tenantId, email } },
    });
    if (existingUser) {
      return { success: false, error: "Ein Benutzer mit dieser E-Mail existiert bereits" };
    }

    let employee = null;
    if (input.employeeId) {
      employee = await tx.employee.findUnique({ where: { id: input.employeeId } });
      if (!employee || employee.tenantId !== tenantId) {
        return { success: false, error: "Mitarbeiter nicht gefunden" };
      }
      const userAccount = await tx.user.findUnique({
        where: { employeeId: input.employeeId },
      });
      if (userAccount) {
        return { success: false, error: "Mitarbeiter hat bereits einen Benutzer-Account" };
      }
    }

    // Validate requested roles belong to tenant.
    if (input.roleIds.length > 0) {
      const roles = await tx.role.findMany({
        where: { id: { in: input.roleIds }, tenantId },
        select: { id: true },
      });
      if (roles.length !== input.roleIds.length) {
        return { success: false, error: "Eine oder mehrere Rollen sind ungültig" };
      }
    }

    const token = randomBytes(INVITATION_TOKEN_BYTES).toString("hex");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000);

    const invitation = await tx.invitationToken.create({
      data: {
        tenantId,
        email,
        roleIds: input.roleIds,
        invitedById: session.user.id,
        employeeId: employee?.id,
        tokenHash,
        expiresAt,
        status: "PENDING",
      },
    });

    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "invitation.create",
      resourceType: "invitationToken",
      resourceId: invitation.id,
      metadata: { email, employeeId: employee?.id },
    });

    return { success: true, invitationId: invitation.id, token };
  });
}

export async function getPendingInvitations() {
  const { tenantId } = await requirePermission("users:read");
  return withTenant(tenantId, async (tx) => {
    return tx.invitationToken.findMany({
      where: { tenantId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });
  });
}

export async function revokeInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
  const { tenantId, session } = await requirePermission("users:invite");

  return withTenant(tenantId, async (tx) => {
    const invitation = await tx.invitationToken.findUnique({ where: { id: invitationId } });
    if (!invitation || invitation.tenantId !== tenantId) {
      return { success: false, error: "Einladung nicht gefunden" };
    }
    if (invitation.status !== "PENDING") {
      return { success: false, error: "Nur ausstehende Einladungen können widerrufen werden" };
    }

    await tx.invitationToken.update({
      where: { id: invitationId },
      data: { status: "REVOKED" },
    });

    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "invitation.revoke",
      resourceType: "invitationToken",
      resourceId: invitationId,
      metadata: { email: invitation.email },
    });

    return { success: true };
  });
}

export async function validateInvitationToken(token: string): Promise<{ valid: boolean; error?: string; email?: string }> {
  const tokenHash = hashToken(token);
  const invitation = await prismaAdmin.invitationToken.findUnique({
    where: { tenantId_tokenHash: { tenantId: "", tokenHash } },
  });

  if (!invitation) return { valid: false, error: "Ungültiger Einladungscode" };
  if (invitation.status !== "PENDING") return { valid: false, error: "Einladung wurde bereits verwendet oder widerrufen" };
  if (invitation.expiresAt < new Date()) return { valid: false, error: "Einladung ist abgelaufen" };

  return { valid: true, email: invitation.email };
}

export async function acceptInvitation(
  token: string,
  password: string,
  firstName: string,
  lastName: string
): Promise<{ success: boolean; error?: string }> {
  const validation = validatePassword(password);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join(". ") };
  }

  const tokenHash = hashToken(token);
  const invitation = await prismaAdmin.invitationToken.findUnique({
    where: { tenantId_tokenHash: { tenantId: "", tokenHash } },
  });

  if (!invitation) return { success: false, error: "Ungültiger Einladungscode" };
  if (invitation.status !== "PENDING") return { success: false, error: "Einladung wurde bereits verwendet oder widerrufen" };
  if (invitation.expiresAt < new Date()) return { success: false, error: "Einladung ist abgelaufen" };

  const tenantId = invitation.tenantId;

  const existingUser = await prismaAdmin.user.findUnique({
    where: { tenantId_email: { tenantId, email: invitation.email } },
  });
  if (existingUser) {
    return { success: false, error: "Ein Benutzer mit dieser E-Mail existiert bereits" };
  }

  const passwordHash = await hashPassword(password);

  const user = await prismaAdmin.user.create({
    data: {
      tenantId,
      email: invitation.email,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      passwordHash,
      isActive: true,
      isSystemAdmin: false,
      forcePasswordChange: false,
      employeeId: invitation.employeeId ?? undefined,
    },
  });

  if (invitation.roleIds.length > 0) {
    await prismaAdmin.userRole.createMany({
      data: invitation.roleIds.map((roleId) => ({
        tenantId,
        userId: user.id,
        roleId,
      })),
    });
  }

  await prismaAdmin.invitationToken.update({
    where: { id: invitation.id },
    data: { status: "ACCEPTED" },
  });

  await logAudit({
    tenantId,
    userId: user.id,
    action: "invitation.accept",
    resourceType: "invitationToken",
    resourceId: invitation.id,
    metadata: { email: invitation.email },
  });

  return { success: true };
}
