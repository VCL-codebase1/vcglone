"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, Input, Select, Textarea } from "@/components/ui";

type DepartmentOption = { id: string; name: string };
type PersonOption = { id: string; name: string; departmentId: string | null };
type DraftStep = {
  key: number;
  title: string;
  description: string;
  departmentId: string;
  assigneeId: string;
  dueAt: string;
  required: boolean;
};

export function TaskStepsBuilder({ departments, people, minDate }: { departments: DepartmentOption[]; people: PersonOption[]; minDate: string }) {
  const [steps, setSteps] = useState<DraftStep[]>([]);
  const [nextKey, setNextKey] = useState(1);
  const serialized = useMemo(
    () => JSON.stringify(steps.filter((step) => step.title.trim()).map(({ key: _key, ...step }) => step)),
    [steps]
  );

  function addStep() {
    setSteps((current) => [...current, { key: nextKey, title: "", description: "", departmentId: "MAIN", assigneeId: "MAIN", dueAt: "", required: true }]);
    setNextKey((value) => value + 1);
  }

  function updateStep(key: number, patch: Partial<DraftStep>) {
    setSteps((current) => current.map((step) => step.key === key ? { ...step, ...patch } : step));
  }

  return (
    <section className="space-y-4 border-t border-line pt-5">
      <input type="hidden" name="taskSteps" value={serialized} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-ink">Task steps <span className="font-normal text-muted">(optional)</span></h2>
          <p className="text-sm text-muted">Ownership and deadlines inherit from the main task unless you change them.</p>
        </div>
        <Button type="button" variant="secondary" onClick={addStep} className="shrink-0"><Plus className="h-4 w-4" aria-hidden /> Add step</Button>
      </div>

      {steps.length ? <div className="space-y-3">{steps.map((step, index) => {
        const availablePeople = step.departmentId === "MAIN" ? [] : people.filter((person) => person.departmentId === step.departmentId);
        return (
          <div key={step.key} className="rounded-2xl border border-line bg-surface/50 p-3 sm:p-4">
            <div className="flex items-start gap-3">
              <span className="mt-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brandSoft text-xs font-semibold text-brand">{index + 1}</span>
              <div className="min-w-0 flex-1 space-y-3">
                <Input value={step.title} onChange={(event) => updateStep(step.key, { title: event.target.value })} maxLength={200} placeholder="Step name" aria-label={`Step ${index + 1} name`} />
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="space-y-1 text-xs font-medium text-muted">
                    <span>Department</span>
                    <Select value={step.departmentId} onChange={(event) => updateStep(step.key, { departmentId: event.target.value, assigneeId: event.target.value === "MAIN" ? "MAIN" : "" })}>
                      <option value="MAIN">Main task owner</option>
                      {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                    </Select>
                  </label>
                  <label className="space-y-1 text-xs font-medium text-muted">
                    <span>Assigned employee</span>
                    <Select value={step.assigneeId} disabled={step.departmentId === "MAIN"} required={Boolean(step.title.trim()) && step.departmentId !== "MAIN"} onChange={(event) => updateStep(step.key, { assigneeId: event.target.value })}>
                      {step.departmentId === "MAIN" ? <option value="MAIN">Same as main task</option> : <option value="">Select employee</option>}
                      {availablePeople.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
                    </Select>
                  </label>
                  <label className="space-y-1 text-xs font-medium text-muted">
                    <span>Step deadline</span>
                    <Input type="datetime-local" min={minDate} value={step.dueAt} onChange={(event) => updateStep(step.key, { dueAt: event.target.value })} />
                    <span className="block font-normal">Blank uses the main deadline.</span>
                  </label>
                </div>
                <Textarea value={step.description} onChange={(event) => updateStep(step.key, { description: event.target.value })} rows={2} maxLength={2000} placeholder="Instructions or context (optional)" aria-label={`Step ${index + 1} instructions`} />
                <label className="inline-flex items-center gap-2 text-sm font-medium text-ink">
                  <input type="checkbox" checked={step.required} onChange={(event) => updateStep(step.key, { required: event.target.checked })} className="h-4 w-4 rounded border-line" />
                  Required before the main task can be submitted
                </label>
              </div>
              <Button type="button" variant="secondary" className="h-10 w-10 shrink-0 px-0" onClick={() => setSteps((current) => current.filter((item) => item.key !== step.key))} aria-label={`Remove step ${index + 1}`}><Trash2 className="h-4 w-4" aria-hidden /></Button>
            </div>
          </div>
        );
      })}</div> : <p className="rounded-xl border border-dashed border-line p-4 text-center text-sm text-muted">No steps added. The assignee will complete the task as one piece of work.</p>}
    </section>
  );
}
