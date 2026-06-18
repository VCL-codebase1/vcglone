import { createLeaveType } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { Button, Card, Field, Input, PageHeader, StatusBadge, Table, Textarea } from "@/components/ui";

export const runtime = "nodejs";

export default async function LeaveTypesPage() {
  const types = await prisma.leaveType.findMany({ orderBy: { name: "asc" } });
  return (
    <div className="space-y-6">
      <PageHeader title="Leave Types" description="Configure leave categories, entitlements, document requirements, and paid status." />
      <Card>
        <form action={createLeaveType} className="grid gap-4 md:grid-cols-4">
          <Field label="Name"><Input name="name" required /></Field>
          <Field label="Annual entitlement"><Input name="annualEntitlementDays" type="number" min={0} defaultValue={0} required /></Field>
          <div className="md:col-span-2"><Field label="Description"><Textarea name="description" rows={2} /></Field></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="requiresDocument" /> Requires document</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="requiresApproval" defaultChecked /> Requires approval</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isPaid" defaultChecked /> Paid leave</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked /> Active</label>
          <div className="md:col-span-4"><Button type="submit">Create leave type</Button></div>
        </form>
      </Card>
      <Table>
        <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Entitlement</th><th className="px-4 py-3">Document</th><th className="px-4 py-3">Approval</th><th className="px-4 py-3">Paid</th><th className="px-4 py-3">Status</th></tr></thead>
        <tbody className="divide-y divide-line">{types.map((type) => <tr key={type.id}><td className="px-4 py-3 font-medium">{type.name}</td><td className="px-4 py-3">{type.annualEntitlementDays}</td><td className="px-4 py-3">{type.requiresDocument ? "Yes" : "No"}</td><td className="px-4 py-3">{type.requiresApproval ? "Yes" : "No"}</td><td className="px-4 py-3">{type.isPaid ? "Yes" : "No"}</td><td className="px-4 py-3"><StatusBadge value={type.active ? "ACTIVE" : "INACTIVE"} /></td></tr>)}</tbody>
      </Table>
    </div>
  );
}
