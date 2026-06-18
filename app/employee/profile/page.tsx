import { Card, PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";

export const runtime = "nodejs";

export default async function EmployeeProfilePage() {
  const sessionUser = await requireUser();
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: { department: true, manager: true }
  });
  if (!user) return null;

  const rows = [
    ["Name", `${user.firstName} ${user.lastName}`],
    ["Email", user.email],
    ["Phone", user.phone || "-"],
    ["Role", user.role.replace("_", " ")],
    ["Department", user.department?.name || "-"],
    ["Manager", user.manager ? `${user.manager.firstName} ${user.manager.lastName}` : "-"],
    ["Job title", user.jobTitle || "-"],
    ["Date joined", formatDate(user.dateJoined)],
    ["Status", user.employmentStatus]
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Profile" description="Your employee record and reporting assignment." />
      <Card>
        <dl className="divide-y divide-line">
          {rows.map(([label, value]) => (
            <div key={label} className="grid gap-1 py-3 sm:grid-cols-3">
              <dt className="text-sm font-medium text-muted">{label}</dt>
              <dd className="text-sm font-semibold text-ink sm:col-span-2">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}
