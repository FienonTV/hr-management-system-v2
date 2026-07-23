import { auth } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-gray-900 text-white p-4 flex flex-col">
        <h1 className="text-xl font-bold mb-8">HR Management</h1>
        <nav className="flex-1 space-y-2">
          <Link href="/dashboard" className="block p-2 hover:bg-gray-800 rounded">Dashboard</Link>
          <Link href="/dashboard/employees" className="block p-2 hover:bg-gray-800 rounded">Mitarbeiter</Link>
        </nav>
        <form action={logout}>
          <Button variant="destructive" className="w-full">Logout</Button>
        </form>
      </aside>
      <main className="flex-1 p-8 bg-gray-50">
        {children}
      </main>
    </div>
  );
}
