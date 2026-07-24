import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRoles, getRoleById, createRole, updateRole, deleteRole, getAllPermissions } from "@/lib/actions/roles";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (id) {
      const role = await getRoleById(id);
      if (!role) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json(role);
    }

    const pathParts = req.nextUrl.pathname.split("/");
    const maybeId = pathParts[pathParts.length - 1];
    if (maybeId && maybeId !== "roles") {
      const role = await getRoleById(maybeId);
      if (!role) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json(role);
    }

    const [roles, permissions] = await Promise.all([getRoles(), getAllPermissions()]);
    return NextResponse.json({ roles, permissions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, permissionKeys } = await req.json();
    const result = await createRole(name, permissionKeys);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, name, permissionKeys } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    const result = await updateRole(id, name, permissionKeys);
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
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    const result = await deleteRole(id);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
