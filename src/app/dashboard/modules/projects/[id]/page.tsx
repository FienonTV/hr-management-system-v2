import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { getProjectById, type ProjectWithDetails } from "@/lib/actions/projects";
import { getEmployees } from "@/lib/actions/employees";
import { guardModule } from "@/lib/actions/moduleGuard";
import ProjectDetailClient from "./ProjectDetailClient";

function serializeProject(project: ProjectWithDetails) {
  return JSON.parse(JSON.stringify(project)) as ProjectWithDetails;
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await guardModule("projects");
  const session = await auth();
  if (!session?.user) {
    notFound();
  }

  const { id } = await params;
  const [project, employees] = await Promise.all([getProjectById(id), getEmployees()]);
  if (!project) {
    notFound();
  }

  return (
    <ProjectDetailClient
      project={serializeProject(project)}
      employees={employees.map((e) => ({
        id: e.id,
        firstName: e.firstName,
        lastName: e.lastName,
      }))}
    />
  );
}
