import { createLocalStorageAdapter } from "./localAdapter";
import type { StorageAdapter } from "./types";

const DEFAULT_UPLOAD_PATH = "F:/Projects/hr-management-system/uploads";

let adapter: StorageAdapter | null = null;

export function getStorageAdapter(): StorageAdapter {
  if (!adapter) {
    const basePath = process.env.FILE_STORAGE_PATH || DEFAULT_UPLOAD_PATH;
    adapter = createLocalStorageAdapter({ basePath });
  }
  return adapter;
}

export function resetStorageAdapter(): void {
  adapter = null;
}
