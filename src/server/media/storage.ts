/**
 * Where uploaded bytes live.
 *
 * The port is deliberately tiny — put, get, delete against an opaque key — so
 * the S3, R2 or GCS adapter that replaces the in-memory one in production is a
 * single file with no reach into the domain. `MediaService` is the only caller.
 *
 * The in-memory adapter mirrors the in-memory repositories: zero setup, works
 * in tests and in `next dev` with no bucket, and loses its contents on restart
 * exactly as the demo dataset does.
 */

export interface StoredObject {
  bytes: Uint8Array;
  contentType: string;
}

export interface MediaStorage {
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
}

export class MemoryMediaStorage implements MediaStorage {
  private readonly objects = new Map<string, StoredObject>();

  async put(key: string, bytes: Uint8Array, contentType: string): Promise<void> {
    // Copy: the caller owns the buffer it handed us and may reuse it.
    this.objects.set(key, { bytes: Uint8Array.from(bytes), contentType });
  }

  async get(key: string): Promise<StoredObject | null> {
    return this.objects.get(key) ?? null;
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key);
  }
}
