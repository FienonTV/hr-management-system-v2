import { guardModule } from "@/lib/actions/moduleGuard";
import { getProjectLayout } from "@/lib/actions/projectLayouts";
import { getProjectCustomFieldDefinitions } from "@/lib/actions/projectCatalogs";
import ProjectLayoutEditorClient from "./ProjectLayoutEditorClient";

export default async function ProjectLayoutPage() {
  await guardModule("projects");
  const [layout, fields] = await Promise.all([
    getProjectLayout(),
    getProjectCustomFieldDefinitions(),
  ]);

  return (
    <ProjectLayoutEditorClient
      initialTabs={layout?.tabs}
      fieldDefinitions={fields}
    />
  );
}
