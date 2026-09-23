"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import styles from "@/components/office-attendance-scene.module.css";

export type OfficeAttendanceState = "before-check-in" | "checked-in" | "checked-out";
export type OfficeAttendanceTransition = "arriving" | "leaving" | null;

export function OfficeAttendanceScene({
  state,
  transition = null,
  className
}: {
  state: OfficeAttendanceState;
  transition?: OfficeAttendanceTransition;
  className?: string;
}) {
  const [pageVisible, setPageVisible] = useState(true);

  useEffect(() => {
    const updateVisibility = () => setPageVisible(!document.hidden);
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  return (
    <div
      className={cn(styles.scene, className)}
      data-state={state}
      data-transition={transition || "none"}
      data-paused={pageVisible ? "false" : "true"}
      aria-hidden="true"
    >
      <svg viewBox="0 0 760 400" role="presentation" focusable="false" preserveAspectRatio="xMidYMid slice">
        <rect width="760" height="400" rx="30" fill="#f8fafc" />
        <rect className={styles.eveningWash} width="760" height="400" rx="30" fill="#f2eee6" />

        <g className={styles.windowLight}>
          <rect x="32" y="28" width="285" height="166" rx="18" fill="#dcecf7" />
          <circle cx="88" cy="71" r="23" fill="#fff7cf" />
          <path d="M32 151 91 109l45 32 57-61 68 71 56-42v85H32Z" fill="#bed4e5" />
          <path d="M32 166 98 126l48 34 52-55 63 61 56-36v64H32Z" fill="#a9c5da" opacity=".75" />
          <path d="M126 28v166M222 28v166M32 111h285" stroke="#fff" strokeWidth="7" opacity=".9" />
          <path className={styles.cloud} d="M184 63c7-14 29-11 33 2 13-5 25 3 26 15h-76c1-10 8-16 17-17Z" fill="#fff" opacity=".9" />
        </g>

        <g className={styles.whiteboardArea}>
          <rect x="475" y="38" width="175" height="116" rx="13" fill="#fff" stroke="#dce2ec" strokeWidth="4" />
          <path d="M499 69h54M499 84h36" stroke="#294786" strokeWidth="6" strokeLinecap="round" opacity=".8" />
          <path d="m499 126 29-21 24 10 29-29 39 24" fill="none" stroke="#77a7a2" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="528" cy="105" r="5" fill="#f0b76c" />
          <circle cx="552" cy="115" r="5" fill="#294786" />
          <circle cx="581" cy="86" r="5" fill="#77a7a2" />
          <circle cx="620" cy="110" r="5" fill="#e68169" />
        </g>

        <g className={styles.boardColleague}>
          <circle cx="674" cy="95" r="17" fill="#704737" />
          <path d="M659 91c1-17 25-22 31-6l-2 8c-8-8-19-11-29-2Z" fill="#1c2a44" />
          <rect x="655" y="112" width="39" height="59" rx="18" fill="#6e97b9" />
          <path d="M663 169v43M687 169v43" stroke="#263a72" strokeWidth="10" strokeLinecap="round" />
          <path d="M658 126 625 105" stroke="#704737" strokeWidth="8" strokeLinecap="round" />
          <g className={styles.boardArm}>
            <path d="M690 127 708 95" stroke="#704737" strokeWidth="8" strokeLinecap="round" />
            <circle cx="710" cy="91" r="5" fill="#704737" />
          </g>
        </g>

        <g className={styles.backDesk}>
          <rect x="381" y="198" width="208" height="14" rx="7" fill="#d6b28d" />
          <path d="M402 211v64M568 211v64" stroke="#6f7b91" strokeWidth="10" />
          <rect x="453" y="165" width="70" height="39" rx="6" fill="#273f78" />
          <rect x="482" y="202" width="12" height="11" fill="#273f78" />
          <path d="M465 213h46" stroke="#273f78" strokeWidth="7" strokeLinecap="round" />
          <rect x="402" y="183" width="25" height="15" rx="4" fill="#fff" />
          <path d="M405 183v-7h17v7" fill="none" stroke="#77a7a2" strokeWidth="4" />
        </g>

        <g className={styles.passingColleague}>
          <circle cx="360" cy="206" r="16" fill="#a4694e" />
          <path d="M345 202c2-17 27-21 31-3-11-7-20-5-31 3Z" fill="#25314f" />
          <rect x="344" y="222" width="34" height="54" rx="16" fill="#e4a15a" />
          <path d="M350 274 340 323M371 274l13 49" stroke="#263a72" strokeWidth="10" strokeLinecap="round" />
          <path d="m347 235-19 27M375 235l19 25" stroke="#a4694e" strokeWidth="8" strokeLinecap="round" />
          <rect x="321" y="250" width="24" height="18" rx="4" fill="#243a79" />
        </g>

        <g className={styles.plant}>
          <path d="M688 247c-2-50 1-78 12-108M690 219c-18-29-29-46-44-58M695 193c16-28 28-43 43-55" fill="none" stroke="#537f72" strokeWidth="6" strokeLinecap="round" />
          <g className={styles.plantLeaves} fill="#6e9b87">
            <ellipse cx="646" cy="157" rx="24" ry="11" transform="rotate(32 646 157)" />
            <ellipse cx="661" cy="188" rx="26" ry="12" transform="rotate(20 661 188)" />
            <ellipse cx="735" cy="137" rx="25" ry="11" transform="rotate(-31 735 137)" />
            <ellipse cx="720" cy="171" rx="25" ry="11" transform="rotate(-24 720 171)" />
            <ellipse cx="700" cy="137" rx="22" ry="10" transform="rotate(-78 700 137)" />
          </g>
          <path d="M661 241h69l-11 79h-47Z" fill="#d58f71" />
          <path d="M660 241h71" stroke="#b8725b" strokeWidth="8" strokeLinecap="round" />
        </g>

        <g className={styles.frontDesk}>
          <ellipse cx="284" cy="351" rx="244" ry="19" fill="#dce1e9" opacity=".75" />
          <rect x="75" y="274" width="430" height="18" rx="9" fill="#cda47d" />
          <rect x="91" y="290" width="18" height="67" rx="6" fill="#344666" />
          <rect x="470" y="290" width="18" height="67" rx="6" fill="#344666" />
          <rect x="120" y="250" width="43" height="17" rx="7" fill="#fff" />
          <path d="M124 250v-8h31v8" fill="none" stroke="#77a7a2" strokeWidth="5" />
          <rect x="390" y="257" width="43" height="12" rx="6" fill="#eff2f6" />
          <circle cx="456" cy="263" r="8" fill="#e2a168" />
        </g>

        <g className={styles.openLaptop}>
          <path d="M241 218h112l-10 56h-92Z" fill="#243a79" />
          <rect x="251" y="227" width="92" height="39" rx="4" fill="#dfeaf4" />
          <circle cx="297" cy="247" r="5" fill="#769fa3" />
          <path d="M226 274h143l-12 9H239Z" fill="#1c2c5f" />
        </g>
        <g className={styles.closedLaptop}>
          <path d="M229 269h137l-10 13H241Z" fill="#243a79" />
          <path d="M271 270h53" stroke="#8da0c5" strokeWidth="3" strokeLinecap="round" />
        </g>

        <g className={styles.chair}>
          <rect x="260" y="278" width="80" height="55" rx="22" fill="#93a5bc" />
          <path d="M300 326v26M271 353h58" stroke="#52627a" strokeWidth="8" strokeLinecap="round" />
          <circle cx="269" cy="356" r="5" fill="#52627a" /><circle cx="331" cy="356" r="5" fill="#52627a" />
        </g>

        <g className={styles.seatedEmployee}>
          <circle cx="297" cy="195" r="22" fill="#8a573f" />
          <path d="M276 191c2-24 35-27 43-8-13-7-29-8-43 8Z" fill="#1f2b48" />
          <path d="M280 215h35c17 12 22 35 15 62h-63c-4-27 0-48 13-62Z" fill="#4867a8" />
          <g className={styles.typingHands}>
            <path d="m279 236-17 28M316 237l17 27" stroke="#8a573f" strokeWidth="9" strokeLinecap="round" />
            <circle cx="260" cy="266" r="6" fill="#8a573f" /><circle cx="335" cy="266" r="6" fill="#8a573f" />
          </g>
        </g>

        <g className={styles.arrivingEmployee}>
          <circle cx="116" cy="210" r="21" fill="#8a573f" />
          <path d="M95 207c2-23 35-27 42-8-13-7-28-8-42 8Z" fill="#1f2b48" />
          <rect x="98" y="230" width="38" height="59" rx="17" fill="#4867a8" />
          <path d="m105 287-10 52M129 287l13 52" stroke="#263a72" strokeWidth="11" strokeLinecap="round" />
          <path d="m101 243-23 27M133 243l22 26" stroke="#8a573f" strokeWidth="9" strokeLinecap="round" />
          <path d="M144 263h25v30h-25Z" fill="#263a72" />
          <path d="M148 263c0-9 17-9 17 0" fill="none" stroke="#263a72" strokeWidth="5" />
        </g>

        <g className={styles.departingEmployee}>
          <circle cx="486" cy="226" r="20" fill="#8a573f" />
          <path d="M466 222c2-22 33-25 40-7-12-7-27-8-40 7Z" fill="#1f2b48" />
          <rect x="469" y="245" width="36" height="56" rx="16" fill="#4867a8" />
          <path d="m476 299-12 46M499 299l15 46" stroke="#263a72" strokeWidth="10" strokeLinecap="round" />
          <path d="m474 257-22 23M502 257l21 23" stroke="#8a573f" strokeWidth="8" strokeLinecap="round" />
          <rect x="517" y="273" width="25" height="28" fill="#263a72" />
        </g>

        <g className={styles.deskLamp}>
          <path d="M190 271v-52l35-20" fill="none" stroke="#354769" strokeWidth="7" strokeLinecap="round" />
          <path d="m215 190 33 14-11 26-37-16Z" fill="#f0b76c" />
          <path className={styles.lampGlow} d="m221 220 51 54h-85Z" fill="#ffe6a8" opacity=".2" />
        </g>
      </svg>
    </div>
  );
}
