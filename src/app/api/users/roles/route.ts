import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { assignRoleToUser, removeRoleFromUser } from "@/lib/actions/roles";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { userId, roleId } = await req.json();
    if (!userId || !roleId) {
      return NextResponse.json({ error: "Missing userId or roleId" }, { status: 400 });
    }
    const result = await assignRoleToUser(userId, roleId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { userId, roleId } = await req.json();
    if (!userId || !roleId) {
      return NextResponse.json({ error: "Missing userId or roleId" }, { status: 400 });
    }
    const result = await removeRoleFromUser(userId, roleId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
