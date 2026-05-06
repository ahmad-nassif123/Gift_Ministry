import fs from "node:fs/promises";
import signpdf from "@signpdf/signpdf";
import { plainAddPlaceholder } from "@signpdf/placeholder-plain";
import { P12Signer } from "@signpdf/signer-p12";

export type PdfSignMeta = {
  reason?: string;
  contactInfo?: string;
  name?: string;
  location?: string;
};

export async function signPdfBufferWithP12(input: {
  pdfBuffer: Buffer;
  p12Path: string;
  passphrase?: string;
  meta?: PdfSignMeta;
}): Promise<Buffer> {
  const p12 = await fs.readFile(input.p12Path);
  const signer = new P12Signer(p12, {
    passphrase: input.passphrase,
  });

  const pdfWithPlaceholder = plainAddPlaceholder({
    pdfBuffer: input.pdfBuffer,
    reason: input.meta?.reason ?? "System generated document",
    contactInfo: input.meta?.contactInfo ?? "",
    name: input.meta?.name ?? "System",
    location: input.meta?.location ?? "",
  });

  const signed = await signpdf.sign(pdfWithPlaceholder, signer);
  return Buffer.from(signed);
}

