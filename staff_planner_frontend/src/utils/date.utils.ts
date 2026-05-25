import { format, formatDistanceToNow, parseISO, differenceInHours } from "date-fns";

export const todayISO = () => format(new Date(), "yyyy-MM-dd");
export const tomorrowISO = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return format(d, "yyyy-MM-dd");
};

/**
 * Returns true if the YYYY-MM-DD string falls on a Sunday.
 * Parses as a local date to avoid UTC-offset edge cases.
 */
export const isSunday = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay() === 0;
};
export const fmtDateLong = (iso: string) => {
  try {
    return format(parseISO(iso), "EEEE, MMM d, yyyy");
  } catch {
    return iso;
  }
};
export const fmtTime = (t: string) => {
  if (!t) return "";
  // Accepts "HH:mm" or "HH:mm:ss"
  const [h, m] = t.split(":");
  const d = new Date();
  d.setHours(Number(h), Number(m || 0), 0, 0);
  return format(d, "h:mm a");
};
export const fmtRelative = (iso: string) => {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return iso;
  }
};
export const hoursSince = (iso: string) => {
  try {
    return differenceInHours(new Date(), parseISO(iso));
  } catch {
    return 0;
  }
};
