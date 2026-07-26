import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/actions/files";
import { auth } from "@/lib/auth";
import type { FileCategory } from "@prisma/client";

const FILE_CATEGORIES: FileCategory[] = [
  "AVATAR",
  "CONTRACT",
  "PAYSLIP",
  "DOCUMENT",
  "CERTIFICATE",
  "OTHER",
];

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Keine Datei" }, { status: 400 });
    }

    const employeeId = String(formData.get("employeeId") || "");
    const parentType = String(formData.get("parentType") || "");
    const parentId = String(formData.get("parentId") || "");
    const category = String(formData.get("category") || "OTHER");
    const expiresAt = String(formData.get("expiresAt") || "");
    const title = String(formData.get("title") || "");
    const notes = String(formData.get("notes") || "");
    const documentCategoryIds = String(formData.get("documentCategoryIds") || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    const validCategory = FILE_CATEGORIES.includes(category as FileCategory)
      ? (category as FileCategory)
      : "OTHER";

    const result = await uploadFile(file, {
      employeeId: employeeId || undefined,
      parentType: parentType || undefined,
      parentId: parentId || undefined,
      category: validCategory,
      title: title || undefined,
      notes: notes || undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      documentCategoryIds,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ fileId: result.fileId, storageKey: result.storageKey }, { status: 201 });
  } catch (error) {
    console.error("File upload API error", error);
    return NextResponse.json({ error: "Upload fehlgeschlagen" }, { status: 500 });
  }
}
