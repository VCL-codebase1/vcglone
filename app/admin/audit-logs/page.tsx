import { PageHeader, Table } from "@/components/ui";
import { formatDateTime } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export default async function AuditLogsPage() {
  const logs = await prisma.auditLog.findMany({ include: { actor: true }, orderBy: { createdAt: "desc" }, take: 250 });
  return (
    <div className="space-y-6">
      <PageHeader title="Audit Logs" description="System events for login, attendance, leave decisions, admin changes, and settings updates." />
      <Table>
        <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Time</th><th className="px-4 py-3">Actor</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Entity</th><th className="px-4 py-3">Metadata</th></tr></thead>
        <tbody className="divide-y divide-line">
          {logs.map((log) => <tr key={log.id}><td className="px-4 py-3">{formatDateTime(log.createdAt)}</td><td className="px-4 py-3">{log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : "System"}</td><td className="px-4 py-3">{log.action}</td><td className="px-4 py-3">{log.entityType}</td><td className="max-w-md truncate px-4 py-3 text-muted">{log.metadata ? JSON.stringify(log.metadata) : "-"}</td></tr>)}
        </tbody>
      </Table>
    </div>
  );
}


