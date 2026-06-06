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

/** public = مخزن عام | private = مخزن Private (مثل gift-ministry-blob) */
function blobAccessMode(): "public" | "private" {
  const mode = process.env.BLOB_ACCESS?.trim().toLowerCase();
  if (mode === "public") return "public";
  if (mode === "private") return "private";
  // وجود BLOB_STORE_ID يعني مخزناً مربوطاً — gift-ministry-blob خاص ويتطلب private
  if (blobStoreId()) return "private";
  return "public";
}

/** خيارات المصادقة لـ @vercel/blob (توكن ثابت أو OIDC) */
export function getBlobAuthOptions(): BlobAuthOptions | null {
  const token = blobReadWriteToken();
  const storeId = blobStoreId();

  if (token) {
    return storeId ? { token, storeId } : { token };
  }

  const oidcToken = blobOidcToken();
  if (storeId && oidcToken) {
    return { storeId, oidcToken };
  }

  return null;
}

export function isBlobStorageConfigured(): boolean {
  return Boolean(getBlobAuthOptions() || blobStoreId());
}

export function usesPrivateBlobStore(): boolean {
  return blobAccessMode() === "private";
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
      "لم يُعثَر على مصادقة Vercel Blob. أضف BLOB_READ_WRITE_TOKEN من Storage → Blob → Restore Token، ثم Redeploy."
    );
  }

  const pathname = `product-uploads/${fileName}`;

  return put(pathname, file, {
    access: blobAccessMode(),
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
