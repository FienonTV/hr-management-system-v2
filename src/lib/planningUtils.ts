export function nextWorkingDay(dateStr: string, delta: number, weekendMode: "none" | "saturday" | "both"): string {
  const date = new Date(`${dateStr}T00:00:00`);
  let steps = 0;
  while (steps < Math.abs(delta)) {
    date.setDate(date.getDate() + Math.sign(delta));
    const day = date.getDay();
    if (day === 0) continue;
    if (day === 6 && weekendMode !== "saturday" && weekendMode !== "both") continue;
    steps++;
  }
  return date.toISOString().split("T")[0];
}

export function isWeekend(dateStr: string, weekendMode: "none" | "saturday" | "both"): boolean {
  const date = new Date(`${dateStr}T00:00:00`);
  const day = date.getDay();
  if (day === 0) return true;
  if (day === 6 && weekendMode !== "saturday" && weekendMode !== "both") return true;
  return false;
}

export function getLastWorkingDay(date: Date): Date {
  const result = new Date(date);
  do {
    result.setDate(result.getDate() - 1);
  } while (result.getDay() === 0 || result.getDay() === 6);
  return result;
}

export function formatDateDE(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}.${month}.${year}`;
}

export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function parsePoolDepartments(value: string | null): string[] {
  if (!value) return [];
  try {
    return JSON.parse(value) as string[];
  } catch {
    return [];
  }
}
