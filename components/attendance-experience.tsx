"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AttendanceActionCard } from "@/components/attendance-action-card";
import { OfficeAttendanceScene, type OfficeAttendanceState, type OfficeAttendanceTransition } from "@/components/office-attendance-scene";
import styles from "@/components/office-attendance-scene.module.css";

type Props = {
  attendanceState: OfficeAttendanceState;
  nextAction: "check-in" | "check-out" | "done";
  lastLocation?: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  totalMinutes?: number | null;
  status?: string;
};

export function AttendanceExperience(props: Props) {
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
    <div className={styles.experience}>
        <AttendanceActionCard
          illustration={<div className={styles.illustration}><OfficeAttendanceScene state={props.attendanceState} transition={transition} /></div>}
          nextAction={props.nextAction}
          lastLocation={props.lastLocation}
          checkedInAt={props.checkedInAt}
          checkedOutAt={props.checkedOutAt}
          totalMinutes={props.totalMinutes}
          status={props.status}
          onActionSuccess={handleActionSuccess}
        />
    </div>
  );
}
