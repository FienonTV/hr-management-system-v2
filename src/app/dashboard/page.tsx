import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">Willkommen im HR Management System.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:border-primary-300 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Mitarbeiter</CardTitle>
            <Users className="h-5 w-5 text-primary-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">Verwaltung</p>
            <p className="text-xs text-gray-500">Stammdaten anlegen und bearbeiten</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
