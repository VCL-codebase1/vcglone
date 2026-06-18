import { PageHeader, StatusBadge, Table } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";

export const runtime = "nodejs";

export default async function ManagerTeamPage() {
  const user = await requireUser();
  const members = await prisma.user.findMany({ where: { managerId: user.id }, include: { department: true }, orderBy: [{ firstName: "asc" }] });
  return (
    <div className="space-y-6">
      <PageHeader title="Team Members" description="Employees assigned to you as their manager." />
      <Table>
        <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Job title</th><th className="px-4 py-3">Joined</th><th className="px-4 py-3">Status</th></tr></thead>
        <tbody className="divide-y divide-line">
          {members.map((member) => (
            <tr key={member.id}><td className="px-4 py-3 font-medium">{member.firstName} {member.lastName}</td><td className="px-4 py-3">{member.email}</td><td className="px-4 py-3">{member.department?.name || "-"}</td><td className="px-4 py-3">{member.jobTitle || "-"}</td><td className="px-4 py-3">{formatDate(member.dateJoined)}</td><td className="px-4 py-3"><StatusBadge value={member.employmentStatus} /></td></tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
