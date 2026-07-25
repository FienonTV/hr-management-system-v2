export interface StorageAdapter {
  /** Schreibt Blob und gibt storageKey zurück. */
  upload(storageKey: string, data: Buffer, mimeType: string): Promise<void>;

  /** Liest Blob. */
  download(storageKey: string): Promise<Buffer>;

  /** Löscht Blob. */
  delete(storageKey: string): Promise<void>;

  /** Prüft, ob Blob existiert. */
  exists(storageKey: string): Promise<boolean>;
}

export interface StorageAdapterOptions {
  basePath: string;
}
