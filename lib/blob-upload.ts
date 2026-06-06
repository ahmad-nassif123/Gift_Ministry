import { put, type PutBlobResult } from "@vercel/blob";

export type BlobAuthOptions = {
  token?: string;
  storeId?: string;
  oidcToken?: string;
};

function blobStoreId(): string | undefined {
  const raw = process.env.BLOB_STORE_ID?.trim();
  return raw || undefined;
}

function blobReadWriteToken(): string | undefined {
  const raw = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  return raw || undefined;
}

function blobOidcToken(): string | undefined {
  const raw = process.env.VERCEL_OIDC_TOKEN?.trim();
  return raw || undefined;
}

/** خيارات المصادقة لـ @vercel/blob (توكن ثابت أو OIDC) */
export function getBlobAuthOptions(): BlobAuthOptions | null {
  const token = blobReadWriteToken();
  if (token) return { token };

  const storeId = blobStoreId();
  const oidcToken = blobOidcToken();
  if (storeId && oidcToken) {
    return { storeId, oidcToken };
  }

  return null;
}

export function isBlobStorageConfigured(): boolean {
  return Boolean(getBlobAuthOptions() || blobStoreId());
}

/** مخزن OIDC (Private Store) بدون توكن ثابت */
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
  const auth = getBlobAuthOptions();
  if (!auth) {
    throw new Error(
      "لم يُعثَر على مصادقة Vercel Blob. أضف BLOB_READ_WRITE_TOKEN من Storage → Blob → Tokens، أو Redeploy بعد ربط المخزن بـ OIDC."
    );
  }

  const pathname = `product-uploads/${fileName}`;
  const access = usesPrivateBlobStore() ? ("private" as const) : ("public" as const);

  return put(pathname, file, {
    access,
    addRandomSuffix: false,
    ...auth,
  });
}

export function uploadErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return "فشل في رفع الصورة";
}
