import { SelfServiceLeavePage } from "@/components/self-service-leave-page";

export const runtime = "nodejs";

export default async function ManagerLeavePage() {
  return <SelfServiceLeavePage applyHref="/manager/my-leave/apply" />;
}
