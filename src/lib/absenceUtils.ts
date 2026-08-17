export function absenceTypeLabel(type: string) {
  const labels: Record<string, string> = {
    VACATION: "Urlaub",
    SICK: "Krank",
    PARENTAL: "Elternzeit",
    UNPAID: "Unbezahlt",
    OTHER: "Sonstiges",
  };
  return labels[type] || type;
}

export function absenceStatusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "Ausstehend",
    APPROVED: "Genehmigt",
    REJECTED: "Abgelehnt",
    CANCELLED: "Storniert",
  };
  return labels[status] || status;
}

export function businessDays(start: Date, end: Date) {
  let count = 0;
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);
  while (cur <= last) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export function vacationDaysUsed(requests: { startAt: Date; endAt: Date; status: string; type: string }[]) {
  return requests
    .filter((r) => r.status === "APPROVED" && r.type === "VACATION")
    .reduce((sum, r) => sum + businessDays(r.startAt, r.endAt), 0);
}
