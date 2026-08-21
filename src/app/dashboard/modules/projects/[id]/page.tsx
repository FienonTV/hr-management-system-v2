import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { getProjectById, type ProjectWithDetails } from "@/lib/actions/projects";
import { getProjectLayout } from "@/lib/actions/projectLayouts";
import { getProjectCustomFieldDefinitions } from "@/lib/actions/projectCatalogs";
import { guardModule } from "@/lib/actions/moduleGuard";
import ProjectDetailClient from "./ProjectDetailClient";

function serializeProject(project: ProjectWithDetails) {
  return JSON.parse(JSON.stringify(project)) as ProjectWithDetails;
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await guardModule("projects", "projects:read");
  const session = await auth();
  if (!session?.user) {
    notFound();
  }

  const { id } = await params;
  const [project, layout, fieldDefinitions] = await Promise.all([
    getProjectById(id),
    getProjectLayout(),
    getProjectCustomFieldDefinitions(),
  ]);
  if (!project) {
    notFound();
  }

  return (
    <ProjectDetailClient
      project={serializeProject(project)}
      layout={layout?.tabs ?? []}
      fieldDefinitions={fieldDefinitions}
    />
  );
}
