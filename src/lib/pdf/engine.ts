import puppeteer from "puppeteer";
import { PDFDocument, rgb } from "pdf-lib";
import { getStorageAdapter } from "../storage";

export interface PdfOptions {
  headerHtml?: string;
  footerHtml?: string;
  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;
  letterheadPath?: string; // PNG/JPG background applied to every page
  format?: "A4" | "A3" | "A5" | "Letter" | "Legal";
  landscape?: boolean;
  printBackground?: boolean;
}

export interface RenderContext {
  [key: string]: string | number | Date | undefined | null;
}

function escapeHtml(value: unknown): string {
  if (value == null) return "";
  const str = String(value);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function substituteVariables(template: string, context: RenderContext): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = context[key];
    return escapeHtml(value ?? "");
  });
}

function buildFullHtml(body: string, options: PdfOptions): string {
  const margins = {
    top: options.marginTop ?? "20mm",
    bottom: options.marginBottom ?? "20mm",
    left: options.marginLeft ?? "20mm",
    right: options.marginRight ?? "20mm",
  };

  const header = options.headerHtml
    ? `<div style="font-size: 9px; color: #666; padding: 5mm 0;">${options.headerHtml}</div>`
    : "";
  const footer = options.footerHtml
    ? `<div style="font-size: 9px; color: #666; padding: 5mm 0;">${options.footerHtml}</div>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { size: ${options.format ?? "A4"}; margin: ${margins.top} ${margins.right} ${margins.bottom} ${margins.left}; }
  body { font-family: Arial, Helvetica, sans-serif; line-height: 1.5; color: #111; }
  h1 { font-size: 20px; margin-bottom: 8px; }
  h2 { font-size: 16px; margin-top: 18px; margin-bottom: 6px; }
  p { margin: 6px 0; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th, td { border: 1px solid #ccc; padding: 6px; text-align: left; }
</style>
</head>
<body>
  ${header}
  ${body}
  ${footer}
</body>
</html>`;
}

export async function renderHtmlToPdf(
  html: string,
  options: PdfOptions = {}
): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "C:\\Users\\simon\\.cache\\puppeteer\\chrome\\win64-151.0.7922.47\\chrome-win64\\chrome.exe",
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });

    const pdfBuffer = Buffer.from(await page.pdf({
      format: options.format ?? "A4",
      landscape: options.landscape ?? false,
      printBackground: options.printBackground ?? true,
      margin: {
        top: options.marginTop ?? "20mm",
        bottom: options.marginBottom ?? "20mm",
        left: options.marginLeft ?? "20mm",
        right: options.marginRight ?? "20mm",
      },
    }));

    if (options.letterheadPath) {
      return await applyLetterhead(pdfBuffer, options.letterheadPath);
    }

    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

async function applyLetterhead(pdfBuffer: Buffer, letterheadPath: string): Promise<Buffer> {
  const basePdf = await PDFDocument.load(pdfBuffer);
  const letterheadBytes = await getStorageAdapter().download(letterheadPath).catch(() => null);
  if (!letterheadBytes) return pdfBuffer;

  const letterheadImage = letterheadPath.toLowerCase().endsWith(".png")
    ? await basePdf.embedPng(letterheadBytes)
    : await basePdf.embedJpg(letterheadBytes);

  const { width, height } = letterheadImage.size();

  for (const page of basePdf.getPages()) {
    const pageSize = page.getSize();
    page.drawImage(letterheadImage, {
      x: 0,
      y: 0,
      width: pageSize.width,
      height: (width / pageSize.width) * height,
      opacity: 1,
    });
  }

  return Buffer.from(await basePdf.save());
}

export async function renderTemplateToPdf(
  templateContent: string,
  context: RenderContext,
  options: PdfOptions = {}
): Promise<Buffer> {
  const body = substituteVariables(templateContent, context);
  const html = buildFullHtml(body, options);
  return renderHtmlToPdf(html, options);
}

export function extractVariables(template: string): string[] {
  const matches = template.match(/\{\{(\w+)\}\}/g) ?? [];
  return Array.from(new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, ""))));
}

function escapeString(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildSummaryHtml(data: {
  documentRows: Array<{ startPage: number; endPage: number; name: string }>;
  heading: string;
  signingCity: string;
  signingDate: string;
  signatures: Array<{ label: string; sublabel?: string }>;
  agreementText?: string;
}): string {
  const rows = data.documentRows
    .map((row, i) => {
      const pageRange = row.startPage === row.endPage ? `${row.startPage}` : `${row.startPage}–${row.endPage}`;
      return `
        <tr>
          <td style="padding: 4pt 12pt 4pt 0; font-size: 11pt;">${i + 1}.</td>
          <td style="padding: 4pt 16pt 4pt 0; font-size: 11pt;">${pageRange}</td>
          <td style="padding: 4pt 0; font-size: 11pt;">${escapeString(row.name)}</td>
        </tr>`;
    })
    .join("");

  const cityDateLine = data.signingCity
    ? `${escapeString(data.signingCity)}, den ${data.signingDate}`
    : `den ${data.signingDate}`;

  const signatureCells = data.signatures.map((sig) => {
    const sub = sig.sublabel ? `br\n      <span style="font-size: 10pt; color: #555;">(${escapeString(sig.sublabel)})` : "";
    return `
    <td style="width: ${Math.floor(100 / data.signatures.length)}%; vertical-align: top; padding: 6pt 8pt 0 0; border-top: 1pt solid #333; font-size: 11pt;">
      ${escapeString(sig.label)}${sub}</span>
    </td>`;
  }).join("");

  return buildFullHtml(
    `
<h2 style="font-size: 13pt; font-weight: bold; margin: 0 0 20pt 0; letter-spacing: 0.05em; text-transform: uppercase;">
  ${escapeString(data.heading)}
</h2>

<p style="margin: 0 0 16pt 0; font-size: 11pt;">Der Vertrag beinhaltet folgende Dokumente:</p>

<table style="border-collapse: collapse; margin-bottom: 28pt; width: auto;">
  <thead>
    <tr>
      <th style="text-align: left; padding: 4pt 12pt 6pt 0; font-size: 11pt; border-bottom: 1pt solid #333; font-weight: bold;"></th>
      <th style="text-align: left; padding: 4pt 16pt 6pt 0; font-size: 11pt; border-bottom: 1pt solid #333; font-weight: bold;">Seite</th>
      <th style="text-align: left; padding: 4pt 0 6pt 0; font-size: 11pt; border-bottom: 1pt solid #333; font-weight: bold;">Dokument</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
</table>

${data.agreementText ? `<p style="margin: 0 0 48pt 0; font-size: 11pt;">${escapeString(data.agreementText)}</p>` : ""}

<p style="margin: 0 0 64pt 0; font-size: 11pt;">${cityDateLine}</p>

<table style="width: 90%; border-collapse: collapse;">
  <tr>
    ${signatureCells}
  </tr>
</table>
`,
    {}
  );
}

export async function generateDocumentGroupPdf(
  templateContents: string[],
  context: RenderContext,
  options: {
    companyName: string;
    signingCity?: string;
    pageNumbers?: boolean;
    title?: string;
    employeeFullName: string;
    includeSummaryPage?: boolean;
    summaryHeading?: string;
    signatures?: Array<{ label: string; sublabel?: string }>;
    agreementText?: string;
  }
): Promise<Buffer> {
  const buffers: Buffer[] = [];
  const pageCounts: number[] = [];

  for (const content of templateContents) {
    const substituted = substituteVariables(content, context);
    const html = buildFullHtml(substituted, {});
    const buf = await renderHtmlToPdf(html, { format: "A4", printBackground: true });
    const pageCount = (await PDFDocument.load(buf)).getPageCount();
    buffers.push(buf);
    pageCounts.push(pageCount);
  }

  if (options.includeSummaryPage ?? true) {
    let cumulativePage = 1;
    const documentRows = pageCounts.map((count, i) => {
      const startPage = cumulativePage;
      const endPage = cumulativePage + count - 1;
      cumulativePage += count;
      return { startPage, endPage, name: options.title || `Teil ${i + 1}` };
    });

    const signatures = options.signatures?.length
      ? options.signatures
      : [
          { label: options.companyName, sublabel: "Arbeitgeber" },
          { label: options.employeeFullName, sublabel: "Arbeitnehmer" },
        ];

    const summaryHtml = buildSummaryHtml({
      documentRows,
      heading: options.summaryHeading || "Bestätigung zum Arbeitsvertrag",
      signingCity: options.signingCity ?? "",
      signingDate: new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }),
      signatures,
      agreementText: options.agreementText,
    });
    const summaryBuffer = await renderHtmlToPdf(summaryHtml, { format: "A4", printBackground: true });
    buffers.push(summaryBuffer);
  }

  return mergePdfs(buffers, options.pageNumbers ?? false);
}

async function mergePdfs(buffers: Buffer[], addPageNumbers: boolean): Promise<Buffer> {
  const merged = await PDFDocument.create();
  let currentPage = 1;

  for (const buf of buffers) {
    const doc = await PDFDocument.load(buf);
    const copiedPages = await merged.copyPages(doc, doc.getPageIndices());
    for (const page of copiedPages) {
      merged.addPage(page);
      if (addPageNumbers) {
        // pdf-lib drawing happens on the added page reference; page numbers added simply
        const { width, height } = page.getSize();
        page.drawText(String(currentPage), {
          x: width - 40,
          y: 20,
          size: 9,
          color: rgb(0.4, 0.4, 0.4),
        });
      }
      currentPage++;
    }
  }

  return Buffer.from(await merged.save());
}

export function buildEmployeeContext(
  employee: Record<string, unknown>,
  tenantName: string,
  today = new Date()
): RenderContext {
  const ctx: RenderContext = {
    tenantName,
    today: today.toLocaleDateString("de-DE"),
  };

  const add = (key: string, value: unknown) => {
    if (value == null) return;
    if (value instanceof Date) {
      ctx[key] = value.toLocaleDateString("de-DE");
    } else {
      ctx[key] = String(value);
    }
  };

  add("firstName", employee.firstName);
  add("lastName", employee.lastName);
  add("employeeNumber", employee.employeeNumber);
  add("email", employee.email);
  add("phone", employee.phone);
  add("position", employee.position);
  add("department", employee.department);
  add("startDate", employee.startDate);
  add("birthDate", employee.birthDate);

  // Address fields from JSON address column
  if (typeof employee.address === "object" && employee.address !== null) {
    const addr = employee.address as Record<string, unknown>;
    add("street", addr.street);
    add("zipCode", addr.zipCode ?? addr.zip);
    add("city", addr.city);
    add("country", addr.country);
  }

  return ctx;
}
