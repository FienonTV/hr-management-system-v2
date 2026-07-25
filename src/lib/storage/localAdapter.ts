import { promises as fs } from "node:fs";
import * as path from "node:path";
import type { StorageAdapter, StorageAdapterOptions } from "./types";

export function createLocalStorageAdapter(options: StorageAdapterOptions): StorageAdapter {
  const basePath = path.resolve(options.basePath);

  function absolutePath(storageKey: string): string {
    // Prevent path traversal: normalize and ensure it stays within basePath.
    const target = path.resolve(basePath, storageKey);
    if (!target.startsWith(basePath + path.sep) && target !== basePath) {
      throw new Error("Invalid storage key: path traversal detected");
    }
    return target;
  }

  return {
    async upload(storageKey, data) {
      const target = absolutePath(storageKey);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, data);
    },

    async download(storageKey) {
      const target = absolutePath(storageKey);
      return fs.readFile(target);
    },

    async delete(storageKey) {
      const target = absolutePath(storageKey);
      try {
        await fs.unlink(target);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          throw error;
        }
      }
    },

    async exists(storageKey) {
      const target = absolutePath(storageKey);
      try {
        await fs.access(target);
        return true;
      } catch {
        return false;
      }
    },
  };
}
