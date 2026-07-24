import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUsersWithRoles } from "@/lib/actions/users";
import { getRoles } from "@/lib/actions/roles";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [users, roles] = await Promise.all([getUsersWithRoles(), getRoles()]);
    return NextResponse.json({ users, roles });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
