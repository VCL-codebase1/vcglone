"use client";

import { useEffect, useRef, type FormEvent } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { EmployeeProfileFields } from "@/components/employee-profile-fields";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { createEmployee, type EmployeeCreateActionState } from "@/lib/actions";

type DepartmentOption = { id: string; name: string };
type ManagerOption = { id: string; firstName: string; lastName: string };

const initialState: EmployeeCreateActionState = { status: "idle" };

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm font-medium text-danger" role="alert">{message}</p> : null;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Creating account..." : "Create employee"}</Button>;
}

export function EmployeeCreateForm({
  departments,
  managers,
  roleOptions,
  employmentStatuses
}: {
  departments: DepartmentOption[];
  managers: ManagerOption[];
  roleOptions: string[];
  employmentStatuses: string[];
}) {
  const [state, formAction] = useFormState(createEmployee, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const submittedValues = useRef<FormData | null>(null);
  const error = (field: string) => state.fieldErrors?.[field];

  function rememberSubmittedValues(event: FormEvent<HTMLFormElement>) {
    submittedValues.current = new FormData(event.currentTarget);
  }

  useEffect(() => {
    if (state.status !== "error" || !formRef.current || !submittedValues.current) return;
    const form = formRef.current;
    submittedValues.current.forEach((value, name) => {
      if (typeof value !== "string") return;
      const control = form.elements.namedItem(name);
      if (control && "value" in control && !(control instanceof HTMLInputElement && control.type === "file")) {
        control.value = value;
      }
    });
  }, [state]);

  return (
    <form ref={formRef} action={formAction} onSubmit={rememberSubmittedValues} className="grid gap-6 md:grid-cols-2">
      {state.status === "error" ? (
        <div className="md:col-span-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert" aria-live="assertive">
          <p className="font-semibold">The account was not created.</p>
          <p className="mt-1">{state.message}</p>
        </div>
      ) : null}

      <Card className="grid gap-4 md:col-span-2 md:grid-cols-2">
        <div className="md:col-span-2"><h2 className="text-base font-semibold text-ink">Employment and hierarchy</h2></div>
        <Field label="Employee ID">
          <Input name="employeeId" required aria-invalid={Boolean(error("employeeId"))} aria-describedby={error("employeeId") ? "employeeId-error" : undefined} />
          <span id="employeeId-error"><FieldError message={error("employeeId")} /></span>
        </Field>
        <Field label="First name">
          <Input name="firstName" required aria-invalid={Boolean(error("firstName"))} />
          <FieldError message={error("firstName")} />
        </Field>
        <Field label="Last name">
          <Input name="lastName" required aria-invalid={Boolean(error("lastName"))} />
          <FieldError message={error("lastName")} />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" inputMode="email" autoComplete="email" placeholder="employee@company.com" required aria-invalid={Boolean(error("email"))} aria-describedby={error("email") ? "email-error" : undefined} />
          <span id="email-error"><FieldError message={error("email")} /></span>
        </Field>
        <Field label="Phone"><Input name="phone" /></Field>
        <Field label="Initial password" hint="Use at least 6 characters and share it securely.">
          <Input name="password" type="password" minLength={6} autoComplete="new-password" required aria-invalid={Boolean(error("password"))} />
          <FieldError message={error("password")} />
        </Field>
        <Field label="Job title"><Input name="jobTitle" /></Field>
        <Field label="Role">
          <Select name="role" defaultValue="EMPLOYEE" aria-invalid={Boolean(error("role"))}>
            {roleOptions.map((role) => <option key={role}>{role}</option>)}
          </Select>
          <FieldError message={error("role")} />
        </Field>
        <Field label="Employment status">
          <Select name="employmentStatus" defaultValue="ACTIVE">
            {employmentStatuses.map((status) => <option key={status}>{status}</option>)}
          </Select>
        </Field>
        <Field label="Department">
          <Select name="departmentId"><option value="">None</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</Select>
        </Field>
        <Field label="Reporting manager">
          <Select name="managerId"><option value="">None</option>{managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.firstName} {manager.lastName}</option>)}</Select>
        </Field>
        <Field label="Secondary reporting manager">
          <Select name="secondaryManagerId"><option value="">None</option>{managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.firstName} {manager.lastName}</option>)}</Select>
        </Field>
        <Field label="Date joined"><Input name="dateJoined" type="date" /></Field>
      </Card>

      <EmployeeProfileFields />
      <div className="md:col-span-2"><SubmitButton /></div>
    </form>
  );
}
