import { differenceInCalendarDays, eachDayOfInterval, isWeekend } from "date-fns";

const appTimeZone = process.env.APP_TIMEZONE || "Africa/Lagos";

function datePartsInAppTimeZone(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: appTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value)
  };
}

export function todayDateOnly() {
  const { year, month, day } = datePartsInAppTimeZone(new Date());
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: appTimeZone,
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(date));
}

export function formatMonthDay(date: Date | string | null | undefined) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric"
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string | null | undefined) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: appTimeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(date));
}

export function formatTime(date: Date | string | null | undefined) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: appTimeZone,
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(date));
}

export function minutesBetween(start: Date, end: Date) {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

export function countWorkingDays(startDate: Date, endDate: Date) {
  if (differenceInCalendarDays(endDate, startDate) < 0) return 0;
  return eachDayOfInterval({ start: startDate, end: endDate }).filter((day) => !isWeekend(day)).length;
}

export function compactDuration(minutes?: number | null) {
  if (!minutes) return "-";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}
