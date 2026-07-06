import { updateWorkPolicy } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { Button, Card, Field, Input, PageHeader } from "@/components/ui";

export const runtime = "nodejs";

const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

export default async function SettingsPage() {
  const policy = await prisma.workPolicy.findFirst();
  const workingDays = policy?.workingDays || days.slice(0, 5);
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Company settings and work policy." />
      <Card>
        <h2 className="mb-4 font-semibold text-ink">Work policy</h2>
        <form action={updateWorkPolicy} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Work start"><Input name="workStartTime" type="time" defaultValue={policy?.workStartTime || "09:00"} required /></Field>
          <Field label="Work end"><Input name="workEndTime" type="time" defaultValue={policy?.workEndTime || "17:00"} required /></Field>
          <Field label="Grace minutes"><Input name="gracePeriodMinutes" type="number" defaultValue={policy?.gracePeriodMinutes || 15} min={0} /></Field>
          <Field label="Timezone"><Input name="timezone" defaultValue={policy?.timezone || "Africa/Lagos"} required /></Field>
          <div className="md:col-span-4">
            <p className="mb-2 text-sm font-medium text-ink">Working days</p>
            <div className="flex flex-wrap gap-3">
              {days.map((day) => <label key={day} className="flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm"><input type="checkbox" name="workingDays" value={day} defaultChecked={workingDays.includes(day)} /> {day}</label>)}
            </div>
          </div>
          <div className="md:col-span-4"><Button type="submit">Save work policy</Button></div>
        </form>
      </Card>
    </div>
  );
}



