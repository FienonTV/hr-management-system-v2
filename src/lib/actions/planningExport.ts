'use server';

import { withTenant } from "@/lib/db/tenant";
import { requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import puppeteer from "puppeteer";

export async function exportPlanningPdf(dateStr: string): Promise<{ success: true; pdf: string } | { success: false; error: string }> {
  const { tenantId, session } = await requirePermission("planning:export");

  return withTenant(tenantId, async (tx) => {
    const plan = await tx.dailyPlan.findUnique({
      where: { tenantId_date: { tenantId, date: new Date(`${dateStr}T00:00:00`) } },
      include: {
        sites: {
          orderBy: { sortOrder: "asc" },
          include: {
            project: true,
            assignments: { include: { employee: true, vehicle: true } },
          },
        },
      },
    });

    if (!plan) {
      return { success: false, error: "Kein Plan für diesen Tag vorhanden" };
    }

    const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });

    const rows = plan.sites
      .map((site) => {
        return site.assignments
          .map((a) => {
            const start = a.startAt ? `${pad(a.startAt.getHours())}:${pad(a.startAt.getMinutes())}` : "";
            const end = a.endAt ? `${pad(a.endAt.getHours())}:${pad(a.endAt.getMinutes())}` : "";
            return `
              <tr>
                <td>${site.project.name}</td>
                <td>${a.employee ? `${a.employee.lastName}, ${a.employee.firstName}` : "-"}</td>
                <td>${start}${end ? ` – ${end}` : ""}</td>
                <td>${a.vehicle ? `${a.vehicle.name} ${a.vehicle.licensePlate || ""}` : "-"}</td>
                <td>${site.notes || a.notes || ""}</td>
              </tr>
            `;
          })
          .join("");
      })
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
            h1 { font-size: 22px; margin-bottom: 8px; }
            h2 { font-size: 16px; margin-top: 0; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 24px; }
            th { background: #f3f4f6; text-align: left; padding: 10px; border-bottom: 2px solid #e5e7eb; }
            td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
            .status { font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Einsatzplanung – ${formatDateDE(dateStr)}</h1>
          <h2>${tenant?.name || ""}</h2>
          <p class="status">Status: ${plan.status === "PUBLISHED" ? "Freigegeben" : "Entwurf"}</p>
          <table>
            <thead>
              <tr>
                <th>Baustelle / Projekt</th>
                <th>Mitarbeiter</th>
                <th>Zeit</th>
                <th>Fahrzeug</th>
                <th>Notizen</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="5">Keine Einträge</td></tr>'}
            </tbody>
          </table>
        </body>
      </html>
    `;

    let browser;
    try {
      browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "load" });
      const pdf = await page.pdf({ format: "A4", printBackground: true });
      await browser.close();

      await logAudit({
        tenantId,
        userId: session.user.id,
        action: "planning.export",
        resourceType: "dailyPlan",
        resourceId: plan.id,
        metadata: { date: dateStr },
      });

      return { success: true, pdf: Buffer.from(pdf).toString("base64") };
    } catch (err) {
      if (browser) await browser.close();
      return { success: false, error: err instanceof Error ? err.message : "PDF-Fehler" };
    }
  });
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function formatDateDE(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}.${month}.${year}`;
}
