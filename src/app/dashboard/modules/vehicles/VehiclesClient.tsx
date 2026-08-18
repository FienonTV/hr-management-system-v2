"use client";

import { useState } from "react";
import { Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogHeader, DialogTitle, DialogFooter, DialogContent } from "@/components/ui/dialog";
import type { Vehicle, VehicleStatus } from "@prisma/client";
import { createVehicle, updateVehicle, deleteVehicle } from "@/lib/actions/vehicles";

const statusLabels: Record<VehicleStatus, string> = {
  AVAILABLE: "Verfügbar",
  IN_USE: "Im Einsatz",
  MAINTENANCE: "In Wartung",
  OUT_OF_ORDER: "Außer Betrieb",
};

const statusColors: Record<VehicleStatus, string> = {
  AVAILABLE: "bg-green-100 text-green-700",
  IN_USE: "bg-blue-100 text-blue-700",
  MAINTENANCE: "bg-yellow-100 text-yellow-700",
  OUT_OF_ORDER: "bg-red-100 text-red-700",
};

export default function VehiclesClient({ vehicles }: { vehicles: Vehicle[] }) {
  const [list, setList] = useState(vehicles);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    licensePlate: "",
    status: "AVAILABLE" as VehicleStatus,
    notes: "",
  });

  function openCreate() {
    setEditing(null);
    setForm({ name: "", licensePlate: "", status: "AVAILABLE", notes: "" });
    setShowForm(true);
  }

  function openEdit(vehicle: Vehicle) {
    setEditing(vehicle);
    setForm({
      name: vehicle.name,
      licensePlate: vehicle.licensePlate || "",
      status: vehicle.status,
      notes: vehicle.notes || "",
    });
    setShowForm(true);
  }

  async function save() {
    setIsLoading(true);
    if (editing) {
      const result = await updateVehicle(editing.id, form);
      if (result.success) {
        setList((prev) => prev.map((v) => (v.id === editing.id ? result.vehicle : v)));
      }
    } else {
      const result = await createVehicle(form);
      if (result.success) {
        setList((prev) => [...prev, result.vehicle]);
      }
    }
    setShowForm(false);
    setIsLoading(false);
  }

  async function remove(id: string) {
    if (!confirm("Fahrzeug wirklich löschen?")) return;
    setIsLoading(true);
    const result = await deleteVehicle(id);
    if (result.success) {
      setList((prev) => prev.filter((v) => v.id !== id));
    }
    setIsLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>+ Fahrzeug</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {list.map((vehicle) => (
          <Card key={vehicle.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                    <Truck className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{vehicle.name}</p>
                    {vehicle.licensePlate && <p className="text-sm text-gray-500">{vehicle.licensePlate}</p>}
                  </div>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[vehicle.status]}`}>
                  {statusLabels[vehicle.status]}
                </span>
              </div>
              {vehicle.notes && <p className="mt-2 text-sm text-gray-600">{vehicle.notes}</p>}
              <div className="mt-4 flex gap-2">
                <Button variant="outline" className="px-2 py-1 text-sm" onClick={() => openEdit(vehicle)}>Bearbeiten</Button>
                <Button variant="destructive" className="px-2 py-1 text-sm" onClick={() => remove(vehicle.id)} disabled={isLoading}>Löschen</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Fahrzeug bearbeiten" : "Fahrzeug erstellen"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Kennzeichen</Label>
              <Input value={form.licensePlate} onChange={(e) => setForm({ ...form, licensePlate: e.target.value })} />
            </div>
            <div>
              <Label>Status</Label>
              <select
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as VehicleStatus })}
              >
                <option value="AVAILABLE">Verfügbar</option>
                <option value="IN_USE">Im Einsatz</option>
                <option value="MAINTENANCE">In Wartung</option>
                <option value="OUT_OF_ORDER">Außer Betrieb</option>
              </select>
            </div>
            <div>
              <Label>Notizen</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)} disabled={isLoading}>Abbrechen</Button>
            <Button onClick={save} disabled={isLoading || !form.name}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
