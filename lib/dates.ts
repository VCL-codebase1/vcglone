import { differenceInCalendarDays, eachDayOfInterval, format, isWeekend, startOfDay } from "date-fns";

export function todayDateOnly() {
  return startOfDay(new Date());
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "-";
  return format(new Date(date), "MMM d, yyyy");
}

export function formatDateTime(date: Date | string | null | undefined) {
  if (!date) return "-";
  return format(new Date(date), "MMM d, yyyy h:mm a");
}

export function formatTime(date: Date | string | null | undefined) {
  if (!date) return "-";
  return format(new Date(date), "h:mm a");
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
