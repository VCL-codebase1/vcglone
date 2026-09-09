"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button, Dialog, DialogClose, DialogContent, DialogTrigger, Input } from "@/components/ui";
import { deleteEmployee, type DeleteEmployeeActionState } from "@/lib/actions";

const initialState: DeleteEmployeeActionState = { status: "idle" };

function DeleteSubmitButton({ enabled }: { enabled: boolean }) {
  const { pending } = useFormStatus();
  return <Button type="submit" variant="danger" className="bg-red-700 hover:bg-red-800" disabled={!enabled || pending}>{pending ? "Deleting employee..." : "Delete permanently"}</Button>;
}

export function EmployeeDeleteAction({ employeeId, employeeName }: { employeeId: string; employeeName: string }) {
  const [confirmation, setConfirmation] = useState("");
  const [state, formAction] = useFormState(deleteEmployee, initialState);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="secondary" className="text-danger hover:border-red-200 hover:bg-red-50">
          <Trash2 className="h-4 w-4" aria-hidden /> Delete employee
        </Button>
      </DialogTrigger>
      <DialogContent title="Delete employee record" description={`Permanently remove ${employeeName} from vcglOne.`} className="max-w-md rounded-xl">
        <div className="space-y-5">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-900">
            <p className="font-semibold">This action cannot be undone.</p>
            <p className="mt-1">The account, profile, attendance, leave, notifications, and other personal HR records will be deleted. Shared tasks, documents, and chat contributions remain in company history under “Former Employee”.</p>
          </div>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="id" value={employeeId} />
            <label className="block text-sm font-medium text-ink">
              Enter <span className="font-bold">DELETE</span> to confirm
              <Input name="confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" className="mt-2" aria-describedby="delete-employee-error" />
            </label>
            {state.status === "error" ? <p id="delete-employee-error" className="text-sm font-medium text-danger" role="alert">{state.message}</p> : null}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
              <DeleteSubmitButton enabled={confirmation === "DELETE"} />
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
