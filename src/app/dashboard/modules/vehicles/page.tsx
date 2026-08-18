import { getVehicles } from "@/lib/actions/vehicles";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import VehiclesClient from "./VehiclesClient";

export default async function VehiclesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const vehicles = await getVehicles();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Fahrzeuge</h1>
        <p className="text-sm text-gray-600">Fahrzeugverwaltung für die Einsatzplanung.</p>
      </div>
      <VehiclesClient vehicles={vehicles} />
    </div>
  );
}
