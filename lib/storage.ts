import { z } from "zod";
import { createHash, createHmac } from "crypto";

export const allowedUploadTypes = ["application/pdf", "image/jpeg", "image/png"] as const;

type UploadResult = { ok: true; url: string } | { ok: false; message: string };

export function getUploadConfig() {
  const provider = (process.env.UPLOAD_PROVIDER || "none").toLowerCase();
  const maxMb = Number(process.env.MAX_FILE_UPLOAD_MB || "5");
  return {
    provider,
    enabled: ["supabase", "cloudinary", "s3"].includes(provider),
    maxBytes: Math.max(1, maxMb) * 1024 * 1024
  };
}

export const attachmentSchema = z.object({
  type: z.enum(allowedUploadTypes, {
    errorMap: () => ({ message: "Only PDF, JPG, JPEG, and PNG documents are allowed." })
  }),
  size: z.number().positive()
});

export async function uploadLeaveAttachment(file: File, employeeId: string): Promise<UploadResult> {
  const config = getUploadConfig();
  if (!config.enabled) {
    return {
      ok: false as const,
      message: "Document upload storage is not configured. Ask HR to configure UPLOAD_PROVIDER."
    };
  }

  const validation = attachmentSchema.safeParse({ type: file.type, size: file.size });
  if (!validation.success) {
    return { ok: false as const, message: validation.error.issues[0]?.message || "Invalid file." };
  }
  if (file.size > config.maxBytes) {
    return { ok: false as const, message: `File must be ${Math.round(config.maxBytes / 1024 / 1024)}MB or smaller.` };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const objectKey = `leave-documents/${employeeId}/${Date.now()}-${safeName}`;

  if (config.provider === "supabase") return uploadToSupabase(file, objectKey);
  if (config.provider === "cloudinary") return uploadToCloudinary(file, objectKey);
  if (config.provider === "s3") return uploadToS3(file, objectKey);
  return { ok: false, message: "Unsupported upload provider." };
}

async function uploadToSupabase(file: File, objectKey: string): Promise<UploadResult> {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  if (!url || !serviceKey || !bucket) return { ok: false, message: "Supabase Storage is missing required server credentials." };

  const uploadUrl = `${url.replace(/\/$/, "")}/storage/v1/object/${bucket}/${objectKey}`;
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": file.type,
      "x-upsert": "false"
    },
    body: Buffer.from(await file.arrayBuffer())
  });
  if (!response.ok) return { ok: false, message: `Supabase upload failed: ${await response.text()}` };
  return { ok: true, url: `${url.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${objectKey}` };
}

async function uploadToCloudinary(file: File, objectKey: string): Promise<UploadResult> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return { ok: false, message: "Cloudinary is missing required server credentials." };

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const folder = "workforceops/leave-documents";
  const publicId = objectKey.replace(/\.[^.]+$/, "");
  const signatureBase = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const signature = createHash("sha1").update(signatureBase).digest("hex");
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", timestamp);
  formData.append("folder", folder);
  formData.append("public_id", publicId);
  formData.append("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: "POST",
    body: formData
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.secure_url) return { ok: false, message: `Cloudinary upload failed: ${payload.error?.message || response.statusText}` };
  return { ok: true, url: payload.secure_url as string };
}

async function uploadToS3(file: File, objectKey: string): Promise<UploadResult> {
  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.S3_REGION || "us-east-1";
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL;
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return { ok: false, message: "S3 storage is missing required server credentials." };

  const body = Buffer.from(await file.arrayBuffer());
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const normalizedEndpoint = endpoint.replace(/\/$/, "");
  const encodedKey = objectKey.split("/").map(encodeURIComponent).join("/");
  const targetUrl = new URL(`${normalizedEndpoint}/${bucket}/${encodedKey}`);
  const host = targetUrl.host;
  const payloadHash = createHash("sha256").update(body).digest("hex");
  const canonicalHeaders = `content-type:${file.type}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = ["PUT", targetUrl.pathname, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, createHash("sha256").update(canonicalRequest).digest("hex")].join("\n");
  const signingKey = getAwsSigningKey(secretAccessKey, dateStamp, region, "s3");
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(targetUrl, {
    method: "PUT",
    headers: {
      Authorization: authorization,
      "Content-Type": file.type,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate
    },
    body
  });
  if (!response.ok) return { ok: false, message: `S3 upload failed: ${await response.text()}` };
  return { ok: true, url: publicBaseUrl ? `${publicBaseUrl.replace(/\/$/, "")}/${encodedKey}` : targetUrl.toString() };
}

function getAwsSigningKey(secret: string, dateStamp: string, region: string, service: string) {
  const kDate = createHmac("sha256", `AWS4${secret}`).update(dateStamp).digest();
  const kRegion = createHmac("sha256", kDate).update(region).digest();
  const kService = createHmac("sha256", kRegion).update(service).digest();
  return createHmac("sha256", kService).update("aws4_request").digest();
}
