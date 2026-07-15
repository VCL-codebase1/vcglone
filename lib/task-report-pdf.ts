import path from "node:path";
import PDFDocument from "pdfkit";
import type { getTaskReportData } from "@/lib/task-reporting";

type TaskReportData = Awaited<ReturnType<typeof getTaskReportData>>;

type PdfContext = {
  title: string;
  scopeLabel: string;
  focusLabel: string;
  generatedBy: string;
};

const COLORS = {
  navy: "#102B74",
  navyDark: "#0B1F56",
  teal: "#0F6B68",
  gold: "#E8B12D",
  green: "#047857",
  amber: "#B45309",
  red: "#B42318",
  ink: "#172033",
  muted: "#667085",
  line: "#D9E0EA",
  surface: "#F7F9FC",
  white: "#FFFFFF"
};

const PAGE = { width: 595.28, height: 841.89, left: 42, right: 42, top: 92, bottom: 48 };
const contentWidth = PAGE.width - PAGE.left - PAGE.right;

function clean(value: unknown, fallback = "-") {
  const text = value === null || value === undefined || value === "" ? fallback : String(value);
  return text.replace(/[\u2013\u2014]/g, "-").replace(/\u00b7/g, "|");
}

function displayDate(date: Date | null | undefined) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Lagos", month: "short", day: "numeric", year: "numeric" }).format(date);
}

function displayDateTime(date: Date | null | undefined) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Lagos", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function duration(hours: number) {
  if (!hours) return "-";
  return hours < 24 ? `${hours} hrs` : `${Math.round((hours / 24) * 10) / 10} days`;
}

function statusColor(status: string) {
  if (status === "COMPLETED") return COLORS.green;
  if (status === "OVERDUE" || status === "BLOCKED" || status === "CHANGES_REQUESTED") return COLORS.red;
  if (status === "IN_REVIEW") return COLORS.amber;
  if (status === "IN_PROGRESS" || status === "ASSIGNED") return COLORS.navy;
  return COLORS.muted;
}

export async function createTaskReportPdf(report: TaskReportData, context: PdfContext) {
  const document = new PDFDocument({
    size: "A4",
    margins: { top: PAGE.top, bottom: PAGE.bottom, left: PAGE.left, right: PAGE.right },
    bufferPages: true,
    info: {
      Title: `${context.title} - ${report.range.label}`,
      Author: "Vethan Concepts Group Ltd",
      Subject: "Task management performance report",
      Creator: "vcglOne"
    }
  });
  const chunks: Buffer[] = [];
  const result = new Promise<Buffer>((resolve, reject) => {
    document.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);
  });
  const logoPath = path.join(process.cwd(), "public", "brand", "vcgl-logo.jpg");
  let cursorY = PAGE.top;
  let pageSection = "Executive overview";

  function drawPageHeader(section: string) {
    document.rect(0, 0, PAGE.width, 8).fill(COLORS.navy);
    document.image(logoPath, PAGE.left, 22, { fit: [118, 50], valign: "center" });
    document.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.navy).text("VCGLONE TASK INTELLIGENCE", PAGE.width - PAGE.right - 190, 29, { width: 190, align: "right" });
    document.font("Helvetica").fontSize(8).fillColor(COLORS.muted).text(clean(section).toUpperCase(), PAGE.width - PAGE.right - 190, 43, { width: 190, align: "right" });
    document.moveTo(PAGE.left, 78).lineTo(PAGE.width - PAGE.right, 78).lineWidth(0.7).strokeColor(COLORS.line).stroke();
  }

  function addPage(section: string) {
    document.addPage();
    pageSection = section;
    drawPageHeader(section);
    cursorY = PAGE.top;
  }

  function ensureSpace(height: number, section = pageSection) {
    if (cursorY + height > PAGE.height - PAGE.bottom - 18) addPage(section);
  }

  function sectionHeading(title: string, subtitle?: string) {
    ensureSpace(subtitle ? 48 : 31, title);
    document.roundedRect(PAGE.left, cursorY, 4, subtitle ? 39 : 25, 2).fill(COLORS.navy);
    document.font("Helvetica-Bold").fontSize(13).fillColor(COLORS.ink).text(clean(title), PAGE.left + 14, cursorY + 1, { width: contentWidth - 14 });
    if (subtitle) document.font("Helvetica").fontSize(8.5).fillColor(COLORS.muted).text(clean(subtitle), PAGE.left + 14, cursorY + 20, { width: contentWidth - 14 });
    cursorY += subtitle ? 50 : 34;
    pageSection = title;
  }

  function metricCard(x: number, y: number, width: number, label: string, value: string | number, detail: string, accent: string) {
    document.roundedRect(x, y, width, 64, 7).fillAndStroke(COLORS.surface, COLORS.line);
    document.roundedRect(x, y, 4, 64, 2).fill(accent);
    document.font("Helvetica-Bold").fontSize(7.5).fillColor(COLORS.muted).text(label.toUpperCase(), x + 13, y + 10, { width: width - 20 });
    document.font("Helvetica-Bold").fontSize(18).fillColor(COLORS.ink).text(clean(value, "0"), x + 13, y + 23, { width: width - 20 });
    document.font("Helvetica").fontSize(7).fillColor(COLORS.muted).text(detail, x + 13, y + 48, { width: width - 20 });
  }

  function drawProductivityChart(x: number, y: number, width: number, height: number) {
    document.roundedRect(x, y, width, height, 7).fillAndStroke(COLORS.white, COLORS.line);
    document.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.ink).text("Productivity trend", x + 12, y + 10);
    document.font("Helvetica").fontSize(7).fillColor(COLORS.muted).text("Assigned vs approved completions", x + 12, y + 25);
    const plot = { x: x + 25, y: y + 43, width: width - 37, height: height - 68 };
    const maximum = Math.max(1, ...report.trend.flatMap((item) => [item.assigned, item.completed]));
    document.moveTo(plot.x, plot.y + plot.height).lineTo(plot.x + plot.width, plot.y + plot.height).lineWidth(0.5).strokeColor(COLORS.line).stroke();
    const groupWidth = plot.width / Math.max(1, report.trend.length);
    const barWidth = Math.max(2, Math.min(8, groupWidth * 0.3));
    const labelEvery = Math.max(1, Math.ceil(report.trend.length / 8));
    report.trend.forEach((item, index) => {
      const center = plot.x + index * groupWidth + groupWidth / 2;
      const assignedHeight = (item.assigned / maximum) * plot.height;
      const completedHeight = (item.completed / maximum) * plot.height;
      document.rect(center - barWidth - 1, plot.y + plot.height - assignedHeight, barWidth, assignedHeight).fill("#94A3B8");
      document.rect(center + 1, plot.y + plot.height - completedHeight, barWidth, completedHeight).fill(COLORS.navy);
      if (index % labelEvery === 0) document.font("Helvetica").fontSize(5.5).fillColor(COLORS.muted).text(clean(item.label), center - groupWidth / 2, plot.y + plot.height + 5, { width: groupWidth, align: "center" });
    });
    document.rect(x + width - 92, y + 13, 6, 6).fill("#94A3B8");
    document.font("Helvetica").fontSize(6).fillColor(COLORS.muted).text("Assigned", x + width - 83, y + 12);
    document.rect(x + width - 45, y + 13, 6, 6).fill(COLORS.navy);
    document.text("Completed", x + width - 36, y + 12);
  }

  function drawStatusChart(x: number, y: number, width: number, height: number) {
    document.roundedRect(x, y, width, height, 7).fillAndStroke(COLORS.white, COLORS.line);
    document.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.ink).text("Status distribution", x + 12, y + 10);
    document.font("Helvetica").fontSize(7).fillColor(COLORS.muted).text("Current state of relevant work", x + 12, y + 25);
    const maximum = Math.max(1, ...report.statusData.map((item) => item.value));
    report.statusData.slice(0, 7).forEach((item, index) => {
      const rowY = y + 43 + index * 16;
      document.font("Helvetica").fontSize(6.5).fillColor(COLORS.muted).text(clean(item.name), x + 12, rowY, { width: 82 });
      document.roundedRect(x + 96, rowY + 1, width - 128, 7, 3).fill("#E9EEF5");
      document.roundedRect(x + 96, rowY + 1, Math.max(3, ((width - 128) * item.value) / maximum), 7, 3).fill(statusColor(item.name.toUpperCase().replace(/ /g, "_")));
      document.font("Helvetica-Bold").fontSize(6.5).fillColor(COLORS.ink).text(String(item.value), x + width - 25, rowY, { width: 13, align: "right" });
    });
  }

  function tableHeader(columns: Array<{ label: string; x: number; width: number; align?: "left" | "right" | "center" }>, y: number) {
    document.rect(PAGE.left, y, contentWidth, 22).fill(COLORS.navy);
    columns.forEach((column) => document.font("Helvetica-Bold").fontSize(7).fillColor(COLORS.white).text(column.label.toUpperCase(), column.x + 5, y + 7, { width: column.width - 10, align: column.align || "left" }));
  }

  function simpleTable(
    title: string,
    subtitle: string,
    columns: Array<{ label: string; width: number; align?: "left" | "right" | "center" }>,
    rows: string[][],
    maximumRows = 50
  ) {
    sectionHeading(title, subtitle);
    const positioned = columns.reduce<Array<{ label: string; x: number; width: number; align?: "left" | "right" | "center" }>>((items, column, index) => {
      const x = index ? items[index - 1].x + items[index - 1].width : PAGE.left;
      return [...items, { ...column, x }];
    }, []);
    if (!rows.length) {
      document.roundedRect(PAGE.left, cursorY, contentWidth, 38, 6).fill(COLORS.surface);
      document.font("Helvetica").fontSize(8).fillColor(COLORS.muted).text("No task records matched the selected reporting period and filters.", PAGE.left + 13, cursorY + 14, { width: contentWidth - 26 });
      cursorY += 52;
      return;
    }
    ensureSpace(48, title);
    tableHeader(positioned, cursorY);
    cursorY += 22;
    rows.slice(0, maximumRows).forEach((row, rowIndex) => {
      ensureSpace(25, title);
      if (cursorY === PAGE.top) {
        tableHeader(positioned, cursorY);
        cursorY += 22;
      }
      if (rowIndex % 2 === 0) document.rect(PAGE.left, cursorY, contentWidth, 23).fill(COLORS.surface);
      positioned.forEach((column, columnIndex) => document.font(columnIndex === 0 ? "Helvetica-Bold" : "Helvetica").fontSize(7).fillColor(COLORS.ink).text(clean(row[columnIndex]), column.x + 5, cursorY + 7, { width: column.width - 10, height: 11, ellipsis: true, align: column.align || "left", lineBreak: false }));
      document.moveTo(PAGE.left, cursorY + 23).lineTo(PAGE.width - PAGE.right, cursorY + 23).lineWidth(0.25).strokeColor(COLORS.line).stroke();
      cursorY += 23;
    });
    if (rows.length > maximumRows) {
      document.font("Helvetica-Oblique").fontSize(7).fillColor(COLORS.muted).text(`Showing ${maximumRows} of ${rows.length} rows. The CSV export contains the complete dataset.`, PAGE.left, cursorY + 7, { width: contentWidth });
      cursorY += 24;
    }
    cursorY += 12;
  }

  drawPageHeader(pageSection);
  const reportHeadingY = cursorY;
  const reportHeadingWidth = contentWidth - 130;
  document.font("Helvetica-Bold").fontSize(24).fillColor(COLORS.navyDark);
  const reportHeadingHeight = document.heightOfString(clean(context.title), { width: reportHeadingWidth });
  document.text(clean(context.title), PAGE.left, reportHeadingY, { width: reportHeadingWidth });
  const reportPeriodY = reportHeadingY + reportHeadingHeight + 7;
  document.font("Helvetica").fontSize(10).fillColor(COLORS.muted).text(clean(report.range.label), PAGE.left, reportPeriodY, { width: reportHeadingWidth });
  document.roundedRect(PAGE.width - PAGE.right - 112, reportHeadingY - 2, 112, 45, 7).fill(COLORS.navy);
  document.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.white).text(report.range.period.toUpperCase(), PAGE.width - PAGE.right - 102, reportHeadingY + 8, { width: 92, align: "center" });
  document.font("Helvetica").fontSize(7).fillColor("#DCE6FF").text("PERFORMANCE REPORT", PAGE.width - PAGE.right - 102, reportHeadingY + 23, { width: 92, align: "center" });
  cursorY = Math.max(reportHeadingY + 75, reportPeriodY + 28);

  document.roundedRect(PAGE.left, cursorY, contentWidth, 72, 7).fill(COLORS.surface);
  const contextItems = [
    ["Report scope", context.scopeLabel],
    ["Reporting focus", context.focusLabel],
    ["Generated by", context.generatedBy],
    ["Generated", displayDateTime(new Date())]
  ];
  contextItems.forEach(([label, value], index) => {
    const x = PAGE.left + 14 + (index % 2) * (contentWidth / 2);
    const y = cursorY + 12 + Math.floor(index / 2) * 28;
    document.font("Helvetica-Bold").fontSize(7).fillColor(COLORS.muted).text(label.toUpperCase(), x, y, { width: 95 });
    document.font("Helvetica").fontSize(8.5).fillColor(COLORS.ink).text(clean(value), x + 98, y - 1, { width: contentWidth / 2 - 118, ellipsis: true, lineBreak: false });
  });
  cursorY += 94;

  sectionHeading("Executive summary", "A concise view of task throughput, timeliness, backlog, and completion efficiency.");
  const metrics = [
    ["Assigned", report.metrics.assigned, "Created in period", COLORS.navy],
    ["Completed", report.metrics.completed, "Manager approved", COLORS.green],
    ["Due", report.metrics.due, "Deadlines in period", COLORS.teal],
    ["Overdue", report.metrics.overdue, "Current backlog", COLORS.red],
    ["Completion rate", `${report.metrics.completionRate}%`, "Due work completed", COLORS.navy],
    ["On-time rate", `${report.metrics.onTimeRate}%`, "Completed by deadline", COLORS.green],
    ["Avg. completion", duration(report.metrics.averageCompletionHours), "Start to approval", COLORS.gold]
  ] as const;
  const gap = 8;
  const cardWidth = (contentWidth - gap * 3) / 4;
  metrics.forEach((metric, index) => metricCard(PAGE.left + (index % 4) * (cardWidth + gap), cursorY + Math.floor(index / 4) * 72, cardWidth, metric[0], metric[1], metric[2], metric[3]));
  cursorY += 151;

  document.roundedRect(PAGE.left, cursorY, contentWidth, 46, 7).fill("#EEF3FF");
  document.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.navy).text("MANAGEMENT NOTE", PAGE.left + 13, cursorY + 10);
  document.font("Helvetica").fontSize(8).fillColor(COLORS.ink).text("Task volume is an operational indicator, not a standalone measure of employee performance. Review quality, complexity, dependencies, and documented blockers alongside these figures.", PAGE.left + 13, cursorY + 23, { width: contentWidth - 26 });
  cursorY += 62;

  ensureSpace(190, "Performance trends");
  sectionHeading("Performance trends", "Visual comparison of throughput and the current task pipeline.");
  const chartGap = 10;
  const chartWidth = (contentWidth - chartGap) / 2;
  drawProductivityChart(PAGE.left, cursorY, chartWidth, 175);
  drawStatusChart(PAGE.left + chartWidth + chartGap, cursorY, chartWidth, 175);
  cursorY += 191;

  if (report.people.length) {
    simpleTable(
      "Employee delivery analysis",
      "Individual throughput, overdue exposure, timeliness, and average completion duration.",
      [
        { label: "Employee", width: 132 }, { label: "Department", width: 103 }, { label: "Assigned", width: 52, align: "center" },
        { label: "Completed", width: 58, align: "center" }, { label: "Overdue", width: 52, align: "center" },
        { label: "On time", width: 52, align: "center" }, { label: "Avg time", width: 62, align: "right" }
      ],
      report.people.map((person) => [person.name, person.department, String(person.assigned), String(person.completed), String(person.overdue), `${person.onTimeRate}%`, duration(person.averageCompletionHours)])
    );
  }

  if (report.departments.length && context.scopeLabel.toLowerCase().includes("organization")) {
    simpleTable(
      "Department delivery analysis",
      "Department-level throughput and backlog comparison.",
      [
        { label: "Department", width: 178 }, { label: "Contributors", width: 75, align: "center" }, { label: "Assigned", width: 65, align: "center" },
        { label: "Completed", width: 70, align: "center" }, { label: "Overdue", width: 60, align: "center" }, { label: "On time", width: 63, align: "right" }
      ],
      report.departments.map((department) => [department.name, String(department.members), String(department.assigned), String(department.completed), String(department.overdue), `${department.onTimeRate}%`])
    );
  }

  const now = new Date();
  simpleTable(
    "Task detail",
    "Tasks assigned, due, completed, or still open in the selected reporting view.",
    [
      { label: "Task", width: 132 }, { label: "Assignee", width: 98 }, { label: "Department", width: 75 },
      { label: "Deadline", width: 58 }, { label: "Completed", width: 58 }, { label: "Status", width: 90, align: "right" }
    ],
    report.tasks.map((task) => {
      const status = task.dueAt < now && task.status !== "COMPLETED" && task.status !== "CANCELLED" ? "OVERDUE" : task.status.replace(/_/g, " ");
      return [`${task.taskCode}  ${task.name}`, `${task.assignee.firstName} ${task.assignee.lastName}`, task.assignee.department?.name || "Unassigned", displayDate(task.dueAt), displayDate(task.completedAt), status];
    }),
    250
  );

  sectionHeading("Report methodology", "Definitions used consistently across the dashboard, PDF, and CSV export.");
  const methodology = [
    ["Assigned", "Task record created during the selected period."],
    ["Completed", "Task completion approved by the reviewing manager during the selected period."],
    ["Completion rate", "Tasks due in the period that were completed by the end of the period."],
    ["On-time rate", "Approved completions where completion time was on or before the deadline."],
    ["Average completion", "Elapsed time from task start (or assignment where no start exists) to approval."],
    ["Overdue backlog", "Open tasks whose deadlines have passed at the time this report is generated."]
  ];
  methodology.forEach(([term, definition]) => {
    ensureSpace(26, "Report methodology");
    document.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.ink).text(term, PAGE.left, cursorY, { width: 100 });
    document.font("Helvetica").fontSize(8).fillColor(COLORS.muted).text(definition, PAGE.left + 108, cursorY, { width: contentWidth - 108 });
    cursorY += 23;
  });

  const range = document.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index += 1) {
    document.switchToPage(index);
    const footerLineY = PAGE.height - PAGE.bottom - 14;
    const footerTextY = PAGE.height - PAGE.bottom - 8;
    document.moveTo(PAGE.left, footerLineY).lineTo(PAGE.width - PAGE.right, footerLineY).lineWidth(0.5).strokeColor(COLORS.line).stroke();
    document.font("Helvetica-Bold").fontSize(6.5).fillColor(COLORS.navy).text("VCGL | INTERNAL - CONFIDENTIAL", PAGE.left, footerTextY, { width: 210, lineBreak: false });
    document.font("Helvetica").fontSize(6.5).fillColor(COLORS.muted).text(`Generated by vcglOne | Page ${index - range.start + 1} of ${range.count}`, PAGE.width - PAGE.right - 220, footerTextY, { width: 220, align: "right", lineBreak: false });
  }
  document.flushPages();
  document.end();
  return result;
}
