import type { TimeEntryType } from "@prisma/client";

const typeLabels: Record<TimeEntryType, string> = {
  REGULAR: "Regulär",
  OVERTIME: "Überstunden",
  TRAVEL: "Anfahrt",
  BREAK: "Pause",
};

export function timeEntryTypeLabel(type: TimeEntryType) {
  return typeLabels[type] ?? type;
}
