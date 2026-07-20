"use client";

import { useEffect, useRef, type FormEvent } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { TaskStepsBuilder } from "@/components/task-steps-builder";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { createTask, type TaskCreateActionState } from "@/lib/task-actions";

type AssigneeOption = { id: string; name: string; departmentName: string | null };
type DepartmentOption = { id: string; name: string };
type PersonOption = { id: string; name: string; departmentId: string | null };

const initialState: TaskCreateActionState = { status: "idle" };

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm font-medium text-danger" role="alert">{message}</p> : null;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" className="min-h-12 w-full" disabled={pending}>{pending ? "Creating task..." : "Create and assign task"}</Button>;
}

export function TaskCreateForm({
  assignees,
  people,
  departments,
  priorities,
  minDate
}: {
  assignees: AssigneeOption[];
  people: PersonOption[];
  departments: DepartmentOption[];
  priorities: string[];
  minDate: string;
}) {
  const [state, formAction] = useFormState(createTask, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const submittedValues = useRef<FormData | null>(null);
  const submittedReminders = useRef<Set<string>>(new Set());
  const error = (field: string) => state.fieldErrors?.[field];

  function rememberSubmittedValues(event: FormEvent<HTMLFormElement>) {
    submittedValues.current = new FormData(event.currentTarget);
    submittedReminders.current = new Set(submittedValues.current.getAll("reminderOffsets").filter((entry): entry is string => typeof entry === "string"));
  }

  useEffect(() => {
    if (state.status !== "error" || !formRef.current || !submittedValues.current) return;
    const form = formRef.current;
    submittedValues.current.forEach((entry, name) => {
      if (typeof entry !== "string") return;
      const control = form.elements.namedItem(name);
      if (control && "value" in control && !(control instanceof HTMLInputElement && control.type === "file")) {
        control.value = entry;
      }
    });
    form.querySelectorAll<HTMLInputElement>('input[name="reminderOffsets"]').forEach((checkbox) => {
      checkbox.checked = submittedReminders.current.has(checkbox.value);
    });
  }, [state]);

  return (
    <form ref={formRef} action={formAction} onSubmit={rememberSubmittedValues} className="grid items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
      {state.status === "error" ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 xl:col-span-2" role="alert" aria-live="assertive">
          <p className="font-semibold">The task was not created.</p>
          <p className="mt-1">{state.message}</p>
          {error("resources") ? <p className="mt-1">Files are not retained after an error. Please choose them again.</p> : null}
        </div>
      ) : null}

      <Card className="space-y-5">
        <div><h2 className="font-semibold text-ink">Task details</h2><p className="text-sm text-muted">Clearly explain the work and the result you expect.</p></div>
        <Field label="Task name">
          <Input name="name" required minLength={3} maxLength={160} placeholder="e.g. Prepare Q3 client performance report" aria-invalid={Boolean(error("name"))} />
          <FieldError message={error("name")} />
        </Field>
        <Field label="Description" hint="Include context, scope, and any important constraints.">
          <Textarea name="description" required minLength={5} rows={6} placeholder="Describe the work to be completed..." aria-invalid={Boolean(error("description"))} />
          <FieldError message={error("description")} />
        </Field>
        <Field label="Expected outcome" hint="Optional, but useful for a faster completion review."><Textarea name="expectedOutcome" rows={3} placeholder="What should a successful result look like?" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Assign to">
            <Select name="assigneeId" required defaultValue="" aria-invalid={Boolean(error("assigneeId"))}>
              <option value="" disabled>Select a team member</option>
              {assignees.map((person) => <option key={person.id} value={person.id}>{person.name}{person.departmentName ? ` — ${person.departmentName}` : ""}</option>)}
            </Select>
            <FieldError message={error("assigneeId")} />
          </Field>
          <Field label="Priority"><Select name="priority" defaultValue="MEDIUM">{priorities.map((item) => <option key={item} value={item}>{item}</option>)}</Select></Field>
          <Field label="Start date and time" hint="Optional">
            <Input type="datetime-local" name="startAt" min={minDate} aria-invalid={Boolean(error("startAt"))} />
            <FieldError message={error("startAt")} />
          </Field>
          <Field label="Deadline">
            <Input type="datetime-local" name="dueAt" required min={minDate} aria-invalid={Boolean(error("dueAt"))} />
            <FieldError message={error("dueAt")} />
          </Field>
        </div>
        <TaskStepsBuilder minDate={minDate} departments={departments} people={people} />
        <FieldError message={error("taskSteps")} />
      </Card>

      <div className="space-y-5">
        <Card className="space-y-4">
          <div><h2 className="font-semibold text-ink">Task resources</h2><p className="text-sm text-muted">Attach working files or add one web link per line.</p></div>
          <Field label="Resource links"><Textarea name="resourceLinks" rows={4} placeholder={"https://...\nhttps://..."} /></Field>
          <Field label="Files" hint="Up to 5 MB per file. You can select multiple files."><Input type="file" name="resources" multiple /></Field>
          <FieldError message={error("resources")} />
        </Card>
        <Card className="space-y-4">
          <div><h2 className="font-semibold text-ink">Reminders</h2><p className="text-sm text-muted">Choose when the assignee should receive an in-app reminder.</p></div>
          <div className="space-y-3">
            {[{ value: 1440, label: "24 hours before" }, { value: 120, label: "2 hours before" }, { value: 0, label: "At the deadline" }].map((item) => <label key={item.value} className="flex items-center gap-3 rounded-xl border border-line p-3 text-sm font-medium text-ink"><input type="checkbox" name="reminderOffsets" value={item.value} defaultChecked className="h-4 w-4 rounded border-line" />{item.label}</label>)}
          </div>
        </Card>
        <SubmitButton />
      </div>
    </form>
  );
}
