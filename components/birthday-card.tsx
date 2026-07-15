import { Cake, Gift } from "lucide-react";
import { Card, EmptyState } from "@/components/ui";
import { formatMonthDay, todayDateOnly } from "@/lib/dates";

type BirthdayPerson = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date | null;
  department?: { name: string } | null;
};

export function BirthdaysThisMonthCard({ birthdays }: { birthdays: BirthdayPerson[] }) {
  const today = todayDateOnly();
  const todayMonth = today.getUTCMonth();
  const todayDate = today.getUTCDate();
  const sorted = [...birthdays].sort((a, b) => {
    const first = a.dateOfBirth?.getUTCDate() ?? 0;
    const second = b.dateOfBirth?.getUTCDate() ?? 0;
    return first - second;
  });

  return (
    <Card className="h-fit self-start space-y-4 overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brandSoft text-brand">
            <Cake className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-semibold text-ink">Birthdays this month</h2>
            <p className="text-sm text-muted">Celebrate teammates with birthdays coming up.</p>
          </div>
        </div>
        <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-brand ring-1 ring-line">{sorted.length}</span>
      </div>
      {sorted.length ? (
        <div className="space-y-2">
          {sorted.slice(0, 8).map((person) => {
            const isToday = person.dateOfBirth?.getUTCMonth() === todayMonth && person.dateOfBirth?.getUTCDate() === todayDate;

            return (
              <div key={person.id} className={isToday ? "flex items-center gap-3 rounded-xl border border-brand/40 bg-brandSoft p-3 ring-1 ring-brand/20" : "flex items-center gap-3 rounded-xl border border-line bg-surface/70 p-3"}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-brand ring-1 ring-line dark:bg-panel">
                  <Gift className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{person.firstName} {person.lastName}</p>
                  <p className="truncate text-xs text-muted">{person.department?.name || "No department"}</p>
                </div>
                <div className="shrink-0 text-right">
                  {isToday ? <p className="text-[10px] font-bold uppercase tracking-wide text-success">Today</p> : null}
                  <p className="text-xs font-semibold text-brand">{formatMonthDay(person.dateOfBirth)}</p>
                </div>
              </div>
            );
          })}
          {sorted.length > 8 ? <p className="text-xs text-muted">+{sorted.length - 8} more birthday{sorted.length - 8 === 1 ? "" : "s"} this month</p> : null}
        </div>
      ) : <EmptyState title="No birthdays this month" description="Birthdays will appear here when employees add their date of birth." />}
    </Card>
  );
}
