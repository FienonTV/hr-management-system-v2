import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCalendarAggregatedEvents, getCalendarEmployees, type AggregatedCalendarEvent } from "@/lib/actions/calendarAggregated";
import CalendarClient from "./CalendarClient";

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear() + 1, today.getMonth() + 1, 0, 23, 59, 59, 999);

  const [events, employees] = await Promise.all([
    getCalendarAggregatedEvents({ startAt: start, endAt: end }),
    getCalendarEmployees(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Kalender</h1>
        <p className="text-sm text-gray-600">Alle Termine, Abläufe und Abwesenheiten im Überblick.</p>
      </div>
      <CalendarClient initialEvents={events} employees={employees} />
    </div>
  );
}
