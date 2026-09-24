"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import styles from "@/components/office-attendance-scene.module.css";

export type OfficeAttendanceState = "before-check-in" | "checked-in" | "checked-out";
export type OfficeAttendanceTransition = "arriving" | "leaving" | null;

function Face({ x, y, skin = "#956b53", scale = 1, hair = "#29333e" }: { x: number; y: number; skin?: string; scale?: number; hair?: string }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <path d="M-5 10v14h12V9" fill={skin} />
    <path d="M-14-8Q-13-23 1-23T16-8l-2 17Q7 23-4 17L-13 7Z" fill={skin} />
    <path d="M-14 1q-8-14 0-23Q4-31 15-19l4 12-7-2-4-8Q0-9-11-11l1 14Z" fill={hair} />
    <path d="M4-4 7 3 3 4M0 10q5 3 9-1" fill="none" stroke="#694b3c" strokeWidth="1.2" strokeLinecap="round" />
    <path d="m-9-7 6-1m8 0 6 1" stroke={hair} strokeWidth="1.4" strokeLinecap="round" />
    <circle cx="-5" cy="-4" r="1.3" fill="#263140" /><circle cx="9" cy="-4" r="1.3" fill="#263140" />
    <ellipse cx="-14" cy="1" rx="3" ry="5" fill={skin} />
  </g>;
}

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
      <svg viewBox="0 0 760 400" role="presentation" focusable="false" preserveAspectRatio="xMidYMid meet">
        <rect width="760" height="400" rx="30" fill="#f8fafc" />
        <rect className={styles.eveningWash} width="760" height="400" rx="30" fill="#f2eee6" />
        <path d="M0 255h760v145H0Z" fill="#e8e8e4" />
        <path d="M0 255h760M0 318h760M140 255 60 400M380 255v145M615 255l92 145" stroke="#dadfdc" strokeWidth="1.5" />
        <path d="M36 194h271l99 117H83Z" fill="#fff" opacity=".38" />
        <path d="M353 0v251" stroke="#e3e7eb" strokeWidth="2" />

        <g className={styles.windowLight}>
          <rect x="32" y="28" width="285" height="166" rx="18" fill="#dcecf7" />
          <circle cx="88" cy="71" r="23" fill="#fff7cf" />
          <path d="M32 194v-59h36V99h39v95m19 0v-73h35V83h42v111m18 0v-56h47v-30h49v86" fill="#c4d5df" />
          <path d="M44 146h13m22-32h17m-17 16h17m76-29h20m-20 18h20m-20 18h20m82 1h15m-15 17h15" stroke="#f4f8fa" strokeWidth="4" />
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

        <g className={styles.boardColleague} transform="translate(-45 30)">
          <Face x={674} y={95} skin="#704737" scale={.72} />
          <path d="m663 112 11 6 11-6 9 17-4 44h-34l-2-43Z" fill="#819aab" />
          <path d="m666 115 8 10 9-10m-9 10v40" fill="none" stroke="#ced9df" strokeWidth="1.5" />
          <path d="M663 169v43M687 169v43" stroke="#263a72" strokeWidth="10" strokeLinecap="round" />
          <path d="M658 126 625 105" stroke="#704737" strokeWidth="8" strokeLinecap="round" />
          <g className={styles.boardArm}>
            <path d="M690 127 701 150" stroke="#704737" strokeWidth="8" strokeLinecap="round" />
            <circle cx="702" cy="154" r="4" fill="#704737" />
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
          <Face x={360} y={206} skin="#ad8064" scale={.7} hair="#46382e" />
          <path d="m350 222 10 5 9-5 9 15-3 41h-33l1-40Z" fill="#b39a81" />
          <path d="m351 223 9 12 9-12m-9 12v36" stroke="#eee7df" strokeWidth="1.5" fill="none" />
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

        <g className={styles.chair}>
          <rect x="260" y="278" width="80" height="55" rx="22" fill="#93a5bc" />
          <path d="M300 326v26M271 353h58" stroke="#52627a" strokeWidth="8" strokeLinecap="round" />
          <circle cx="269" cy="356" r="5" fill="#52627a" /><circle cx="331" cy="356" r="5" fill="#52627a" />
        </g>

        <g className={styles.seatedEmployee}>
          <path d="m280 276-4 38 40 15m2-53 8 37-2 26" stroke="#34425c" strokeWidth="13" fill="none" strokeLinecap="round" />
          <path d="M309 330h18m-9 12h20" stroke="#263140" strokeWidth="7" strokeLinecap="round" />
          <Face x={297} y={195} scale={.8} />
          <path d="m284 214 13 7 13-7 12 14 8 49h-63l5-49Z" fill="#526888" />
          <path d="m284 215 13 15 13-15m-13 15v39" stroke="#d7dfe8" strokeWidth="1.6" fill="none" />
          <path d="M307 237h10v9h-10Z" fill="#7185a0" />
          <g className={styles.typingHands}>
            <path d="m279 236-17 28M316 237l17 27" stroke="#8a573f" strokeWidth="9" strokeLinecap="round" />
            <circle cx="260" cy="266" r="6" fill="#8a573f" /><circle cx="335" cy="266" r="6" fill="#8a573f" />
          </g>
        </g>

        <g className={styles.arrivingEmployee}>
          <Face x={116} y={210} scale={.78} />
          <path d="m104 230 12 6 11-6 10 15-1 45H97l1-46Z" fill="#526888" />
          <path d="m106 232 10 13 10-13m-10 13v38" stroke="#d7dfe8" strokeWidth="1.5" fill="none" />
          <path d="m105 287-10 52M129 287l13 52" stroke="#263a72" strokeWidth="11" strokeLinecap="round" />
          <path d="m101 243-23 27M133 243l22 26" stroke="#8a573f" strokeWidth="9" strokeLinecap="round" />
          <path d="M144 263h25v30h-25Z" fill="#263a72" />
          <path d="M148 263c0-9 17-9 17 0" fill="none" stroke="#263a72" strokeWidth="5" />
        </g>

        <g className={styles.departingEmployee}>
          <Face x={486} y={226} scale={.78} />
          <path d="m474 245 12 7 12-7 8 13-1 44h-37l1-44Z" fill="#526888" />
          <path d="m477 248 9 12 9-12m-9 12v34" stroke="#d7dfe8" strokeWidth="1.5" fill="none" />
          <path d="m476 299-12 46M499 299l15 46" stroke="#263a72" strokeWidth="10" strokeLinecap="round" />
          <path d="m474 257-22 23M502 257l21 23" stroke="#8a573f" strokeWidth="8" strokeLinecap="round" />
          <rect x="517" y="273" width="25" height="28" fill="#263a72" />
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


        <g className={styles.deskLamp}>
          <path d="M190 271v-52l35-20" fill="none" stroke="#354769" strokeWidth="7" strokeLinecap="round" />
          <path d="m215 190 33 14-11 26-37-16Z" fill="#f0b76c" />
          <path className={styles.lampGlow} d="m221 220 51 54h-85Z" fill="#ffe6a8" opacity=".2" />
        </g>
        <rect className={styles.morningDim} width="760" height="400" rx="30" fill="#17233d" />
      </svg>
    </div>
  );
}
