import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { addDays, format } from "date-fns";

export function WeeklyWorkCard({ weekStart, records }: { weekStart: Date; records: { date: Date; totalMinutes: number | null }[] }) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    const minutes = records.find((record) => record.date.toISOString().slice(0, 10) === date.toISOString().slice(0, 10))?.totalMinutes ?? 0;
    return { date, minutes };
  });
  const total = days.reduce((sum, day) => sum + day.minutes, 0);
  const ceiling = Math.max(480, ...days.map((day) => day.minutes));
  return (
    <section className="workspace-section flex h-full flex-col">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-medium">This week</h2>
        <Link href="/employee/attendance/history" aria-label="View attendance history" className="focus-ring flex h-10 w-10 items-center justify-center rounded-full bg-surface text-brand"><ArrowUpRight className="h-5 w-5" /></Link>
      </div>
      <div className="mt-6 flex items-end gap-3">
        <p className="text-5xl font-medium tracking-[-0.05em]">{(total / 60).toFixed(1)}<span className="ml-1 text-2xl text-muted">h</span></p>
        <p className="pb-1 text-xs leading-5 text-muted">Recorded work<br />{format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d")}</p>
      </div>
      <div className="mt-auto pt-8">
        <div className="grid grid-cols-7 gap-3" role="img" aria-label={days.map((day) => `${format(day.date, "EEEE")}: ${(day.minutes / 60).toFixed(1)} hours`).join(", ")}>
          {days.map((day) => <div key={day.date.toISOString()} className="flex flex-col items-center gap-3">
            <div className="flex h-32 w-full items-end justify-center rounded-full bg-surface/60">
              <div className="w-3 rounded-full bg-brand" style={{ height: `${Math.max(day.minutes > 0 ? 4 : 0, day.minutes / ceiling * 100)}%` }} />
            </div>
            <span className="text-xs text-muted">{format(day.date, "EEEEE")}</span>
          </div>)}
        </div>
        <p className="mt-5 text-xs text-muted">Completed attendance records. Your current session is shown in the timer.</p>
      </div>
    </section>
  );
}
