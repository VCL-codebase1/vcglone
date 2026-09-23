"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AttendanceActionCard } from "@/components/attendance-action-card";
import { OfficeAttendanceScene, type OfficeAttendanceState, type OfficeAttendanceTransition } from "@/components/office-attendance-scene";

type Props = {
  attendanceState: OfficeAttendanceState;
  nextAction: "check-in" | "check-out" | "done";
  lastLocation?: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  totalMinutes?: number | null;
  status?: string;
};

export function EmployeeAttendanceExperience(props: Props) {
  const router = useRouter();
  const [transition, setTransition] = useState<OfficeAttendanceTransition>(null);
  const transitionTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (transitionTimer.current) window.clearTimeout(transitionTimer.current);
  }, []);

  function handleActionSuccess(action: "check-in" | "check-out") {
    setTransition(action === "check-in" ? "arriving" : "leaving");
    if (transitionTimer.current) window.clearTimeout(transitionTimer.current);
    transitionTimer.current = window.setTimeout(() => setTransition(null), action === "check-in" ? 1_900 : 2_700);
    router.refresh();
  }

  return (
    <div className="grid min-w-0 items-stretch gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
      <section className="order-2 min-h-0 overflow-hidden rounded-3xl border border-white bg-white p-2 lg:order-1">
        <OfficeAttendanceScene state={props.attendanceState} transition={transition} />
      </section>
      <div className="order-1 lg:order-2">
        <AttendanceActionCard
          nextAction={props.nextAction}
          lastLocation={props.lastLocation}
          checkedInAt={props.checkedInAt}
          checkedOutAt={props.checkedOutAt}
          totalMinutes={props.totalMinutes}
          status={props.status}
          onActionSuccess={handleActionSuccess}
        />
      </div>
    </div>
  );
}
