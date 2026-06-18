import { uploadLeaveAttachment } from "@/lib/storage";
import { requireUser } from "@/lib/rbac";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireUser();
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ ok: false, message: "Missing file." }, { status: 400 });
  }
  const result = await uploadLeaveAttachment(file, user.id);
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
