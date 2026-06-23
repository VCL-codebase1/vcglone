"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState, useTransition, type BaseSyntheticEvent } from "react";
import { useForm } from "react-hook-form";
import { toast } from "@/lib/toast";
import type { z } from "zod";
import { applyForLeave } from "@/lib/actions";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { leaveRequestSchema } from "@/lib/validators";

type LeaveTypeOption = {
  id: string;
  name: string;
  requiresDocument: boolean;
  annualEntitlementDays: number;
};

type LeaveRequestValues = z.infer<typeof leaveRequestSchema>;

export function LeaveApplyForm({ leaveTypes, uploadEnabled }: { leaveTypes: LeaveTypeOption[]; uploadEnabled: boolean }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState(leaveTypes[0]?.id || "");
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LeaveRequestValues>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: {
      leaveTypeId: leaveTypes[0]?.id || "",
      reason: ""
    }
  });
  const selectedType = useMemo(() => leaveTypes.find((type) => type.id === leaveTypeId), [leaveTypeId, leaveTypes]);

  function onSubmit(values: LeaveRequestValues, event?: BaseSyntheticEvent) {
    setError("");
    setMessage("");
    const form = event?.target as HTMLFormElement | undefined;
    const formData = new FormData(form);
    formData.set("leaveTypeId", values.leaveTypeId);
    formData.set("startDate", values.startDate.toISOString().slice(0, 10));
    formData.set("endDate", values.endDate.toISOString().slice(0, 10));
    formData.set("reason", values.reason);
    startTransition(async () => {
      const result = await applyForLeave(formData);
      if (result.ok) {
        setMessage(result.message);
        toast.success(result.message);
        form?.reset();
      } else {
        setError(result.message);
        toast.error(result.message);
      }
    });
  }

  return (
    <Card>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
        <Field label="Leave type">
          <Select
            value={leaveTypeId}
            {...register("leaveTypeId", {
              onChange: (event) => setLeaveTypeId(event.target.value)
            })}
            required
          >
            {leaveTypes.map((type) => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </Select>
          {errors.leaveTypeId ? <span className="block text-xs font-normal text-danger">{errors.leaveTypeId.message}</span> : null}
        </Field>
        <div className="rounded-md bg-surface px-3 py-2 text-sm text-muted">
          Annual entitlement: <span className="font-semibold text-ink">{selectedType?.annualEntitlementDays ?? 0} days</span>
        </div>
        <Field label="Start date">
          <Input type="date" required {...register("startDate", { valueAsDate: true })} />
          {errors.startDate ? <span className="block text-xs font-normal text-danger">{errors.startDate.message}</span> : null}
        </Field>
        <Field label="End date">
          <Input type="date" required {...register("endDate", { valueAsDate: true })} />
          {errors.endDate ? <span className="block text-xs font-normal text-danger">{errors.endDate.message}</span> : null}
        </Field>
        <div className="md:col-span-2">
          <Field label="Reason">
            <Textarea rows={5} minLength={10} required {...register("reason")} />
            {errors.reason ? <span className="block text-xs font-normal text-danger">{errors.reason.message}</span> : null}
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
