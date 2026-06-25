import { SelfServiceLeavePage } from "@/components/self-service-leave-page";

export const runtime = "nodejs";

export default async function AdminSelfLeavePage() {
  return <SelfServiceLeavePage applyHref="/admin/my-leave/apply" />;
}
