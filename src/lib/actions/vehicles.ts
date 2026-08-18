'use server';

import { withTenant } from "@/lib/db/tenant";
import { requirePermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import type { Vehicle, VehicleStatus } from "@prisma/client";
import { z } from "zod";

const vehicleSchema = z.object({
  name: z.string().min(1, "Name erforderlich"),
  licensePlate: z.string().optional(),
  status: z.enum(["AVAILABLE", "IN_USE", "MAINTENANCE", "OUT_OF_ORDER"]).default("AVAILABLE"),
  notes: z.string().optional(),
});

export type VehicleInput = z.infer<typeof vehicleSchema>;

export async function getVehicles(): Promise<Vehicle[]> {
  const { tenantId } = await requirePermission("vehicles:read");
  return withTenant(tenantId, async (tx) => {
    return tx.vehicle.findMany({
      where: { tenantId },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    });
  });
}

export async function createVehicle(data: VehicleInput): Promise<{ success: true; vehicle: Vehicle } | { success: false; error: string }> {
  const { tenantId, session } = await requirePermission("vehicles:create");
  const parsed = vehicleSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((e) => e.message).join(", ") };
  }
  return withTenant(tenantId, async (tx) => {
    const vehicle = await tx.vehicle.create({
      data: { ...parsed.data, tenantId },
    });
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "vehicle.create",
      resourceType: "vehicle",
      resourceId: vehicle.id,
      metadata: { name: vehicle.name },
    });
    revalidatePath("/dashboard/modules/vehicles");
    return { success: true, vehicle };
  });
}

export async function updateVehicle(
  id: string,
  data: Partial<VehicleInput>
): Promise<{ success: true; vehicle: Vehicle } | { success: false; error: string }> {
  const { tenantId, session } = await requirePermission("vehicles:update");
  return withTenant(tenantId, async (tx) => {
    const existing = await tx.vehicle.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) {
      return { success: false, error: "Fahrzeug nicht gefunden" };
    }
    const vehicle = await tx.vehicle.update({
      where: { id },
      data,
    });
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "vehicle.update",
      resourceType: "vehicle",
      resourceId: vehicle.id,
      metadata: { name: vehicle.name },
    });
    revalidatePath("/dashboard/modules/vehicles");
    return { success: true, vehicle };
  });
}

export async function deleteVehicle(id: string): Promise<{ success: true } | { success: false; error: string }> {
  const { tenantId, session } = await requirePermission("vehicles:delete");
  return withTenant(tenantId, async (tx) => {
    const existing = await tx.vehicle.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) {
      return { success: false, error: "Fahrzeug nicht gefunden" };
    }
    await tx.vehicle.delete({ where: { id } });
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "vehicle.delete",
      resourceType: "vehicle",
      resourceId: id,
      metadata: { name: existing.name },
    });
    revalidatePath("/dashboard/modules/vehicles");
    return { success: true };
  });
}

export async function getAvailableVehicles(date?: Date): Promise<Vehicle[]> {
  const { tenantId } = await requirePermission("planning:read");
  return withTenant(tenantId, async (tx) => {
    const baseWhere: Record<string, unknown> = { tenantId, status: { in: ["AVAILABLE", "IN_USE"] } };
    return tx.vehicle.findMany({
      where: baseWhere,
      orderBy: { name: "asc" },
    });
  });
}
