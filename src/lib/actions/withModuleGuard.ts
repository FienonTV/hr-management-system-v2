import { guardModule } from "./moduleGuard";

export async function withModuleGuard<T>(
  moduleKey: string,
  fn: () => Promise<T> | T
): Promise<T> {
  await guardModule(moduleKey);
  return fn();
}
