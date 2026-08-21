import { guardModule } from "@/lib/actions/moduleGuard";
import { getProjectLayout } from "@/lib/actions/projectLayouts";
import { getProjectCustomFieldDefinitions } from "@/lib/actions/projectCatalogs";
import { getCurrentUserPermissions } from "@/lib/permissions";
import ProjectLayoutEditorClient from "./ProjectLayoutEditorClient";

export default async function ProjectLayoutPage() {
  await guardModule("projects", "projects:read");
  const permissions = await getCurrentUserPermissions();
  const canReadLayout = permissions.has("projectLayout:read") || permissions.has("projectLayout:update");
  if (!canReadLayout) {
    throw new Error("Keine Berechtigung für den Projekt-Layout-Editor.");
  }

  const [layout, fields] = await Promise.all([
    getProjectLayout(),
    getProjectCustomFieldDefinitions(),
  ]);

  return (
    <ProjectLayoutEditorClient
      initialTabs={layout?.tabs}
      fieldDefinitions={fields}
      permissions={Array.from(permissions)}
    />
  );
}
