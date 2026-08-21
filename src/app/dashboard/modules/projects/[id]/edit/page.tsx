import { guardModule } from "@/lib/actions/moduleGuard";
import { redirect } from "next/navigation";

export default async function ProjectEditRedirect({ params }: { params: Promise<{ id: string }> }) {
  await guardModule("projects", "projects:read");
  const { id } = await params;
  redirect(`/dashboard/modules/projects/${id}`);
}
