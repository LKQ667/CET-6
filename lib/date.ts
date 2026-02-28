import { differenceInCalendarDays, format, isWeekend, parseISO } from "date-fns";
import { toZonedTime } from "date-fns-tz";

import { appConfig } from "@/lib/config";

export function nowInBeijing() {
  return toZonedTime(new Date(), appConfig.reminder.timezone);
}

export function getBeijingDateString(date = new Date()) {
  const zoned = toZonedTime(date, appConfig.reminder.timezone);
  return format(zoned, "yyyy-MM-dd");
}

export function dayIndexInPrep(dateString: string) {
  const date = parseISO(dateString);
  const start = parseISO(appConfig.prep.startDate);
  return differenceInCalendarDays(date, start) + 1;
}

export function phaseByDate(dateString: string): "A" | "B" | "C" | "D" {
  const day = dayIndexInPrep(dateString);
  if (day <= 61) {
    return "A";
  }
  if (day <= 184) {
    return "B";
  }
  if (day <= 275) {
    return "C";
  }
  return "D";
}

export function isWeekendByDate(dateString: string) {
  return isWeekend(parseISO(dateString));
}

