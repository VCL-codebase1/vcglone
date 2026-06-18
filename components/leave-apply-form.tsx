"use client";

import { useMemo, useState, useTransition } from "react";
import { applyForLeave } from "@/lib/actions";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";

type LeaveTypeOption = {
  id: string;
  name: string;
  requiresDocument: boolean;
  annualEntitlementDays: number;
};

export function LeaveApplyForm({ leaveTypes, uploadEnabled }: { leaveTypes: LeaveTypeOption[]; uploadEnabled: boolean }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState(leaveTypes[0]?.id || "");
  const [pending, startTransition] = useTransition();
  const selectedType = useMemo(() => leaveTypes.find((type) => type.id === leaveTypeId), [leaveTypeId, leaveTypes]);

  function action(formData: FormData) {
    setError("");
    setMessage("");
    startTransition(async () => {
      const result = await applyForLeave(formData);
      if (result.ok) setMessage(result.message);
      else setError(result.message);
    });
  }

  return (
    <Card>
      <form action={action} className="grid gap-4 md:grid-cols-2">
        <Field label="Leave type">
          <Select name="leaveTypeId" value={leaveTypeId} onChange={(event) => setLeaveTypeId(event.target.value)} required>
            {leaveTypes.map((type) => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </Select>
        </Field>
        <div className="rounded-md bg-surface px-3 py-2 text-sm text-muted">
          Annual entitlement: <span className="font-semibold text-ink">{selectedType?.annualEntitlementDays ?? 0} days</span>
        </div>
        <Field label="Start date">
          <Input type="date" name="startDate" required />
        </Field>
        <Field label="End date">
          <Input type="date" name="endDate" required />
        </Field>
        <div className="md:col-span-2">
          <Field label="Reason">
            <Textarea name="reason" rows={5} minLength={10} required />
          </Field>
        </div>
        {selectedType?.requiresDocument ? (
          <div className="md:col-span-2">
            <Field label="Supporting document" hint={uploadEnabled ? "PDF, JPG, JPEG, or PNG only." : "Upload storage is not configured, so attachments are disabled."}>
              <Input type="file" name="attachment" accept=".pdf,.jpg,.jpeg,.png" disabled={!uploadEnabled} />
            </Field>
          </div>
        ) : null}
        {error ? <p className="md:col-span-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">{error}</p> : null}
        {message ? <p className="md:col-span-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-success">{message}</p> : null}
        <div className="md:col-span-2">
          <Button type="submit" disabled={pending}>{pending ? "Submitting..." : "Submit leave request"}</Button>
        </div>
      </form>
    </Card>
  );
}
