import { guardModule } from "@/lib/actions/moduleGuard";
import ProjectsClient from "./ProjectsClient";

export default async function ProjectsPage() {
  await guardModule("projects");
  return <ProjectsClient />;
}
