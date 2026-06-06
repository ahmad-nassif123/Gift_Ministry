import { put, type PutBlobResult } from "@vercel/blob";

function blobStoreId(): string | undefined {
  const raw = process.env.BLOB_STORE_ID?.trim();
  return raw || undefined;
}

function blobReadWriteToken(): string | undefined {
  const raw = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  return raw || undefined;
}

export function isBlobStorageConfigured(): boolean {
  return Boolean(blobReadWriteToken() || blobStoreId());
}

/** مخزن OIDC (Private Store) — لا يقبل access: public */
export function usesPrivateBlobStore(): boolean {
  return Boolean(blobStoreId() && !blobReadWriteToken());
}

export function toPublicMediaUrl(blob: PutBlobResult): string {
  if (usesPrivateBlobStore()) {
    return `/api/media?pathname=${encodeURIComponent(blob.pathname)}`;
  }
  return blob.url;
}

export async function uploadProductImage(file: File, fileName: string): Promise<PutBlobResult> {
  const pathname = `product-uploads/${fileName}`;
  const token = blobReadWriteToken();
  const storeId = blobStoreId();
  const access = usesPrivateBlobStore() ? ("private" as const) : ("public" as const);

  return put(pathname, file, {
    access,
    addRandomSuffix: false,
    ...(token ? { token } : {}),
    ...(storeId ? { storeId } : {}),
  });
}

export function uploadErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    const msg = error.message.trim();
    if (/private/i.test(msg) && /public/i.test(msg)) {
      return "مخزن Blob خاص: تم ضبط الرفع تلقائياً. أعد المحاولة بعد نشر آخر تحديث.";
    }
    return msg;
  }
  return "فشل في رفع الصورة";
}
