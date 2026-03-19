/**
 * Formátování „Data šablony“ (templateValues + JobTemplate) pro smlouvu o dílo:
 * plain text (proměnné) a HTML blok (tisk / PDF).
 */

import type {
  JobTemplate,
  JobTemplateField,
  JobTemplateValues,
} from "@/lib/job-templates";
import { escapeHtml, withLineBreaks } from "@/lib/work-contract-print-html";

function isEmptyValue(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string" && v.trim() === "") return true;
  if (Array.isArray(v) && v.length === 0) return true;
  if (
    typeof v === "object" &&
    !Array.isArray(v) &&
    Object.keys(v as object).length === 0
  ) {
    return true;
  }
  return false;
}

/** Čitelný výpis hodnoty bez JSON; pole / objekty zanořeně */
export function formatTemplateValuePlain(
  raw: unknown,
  field?: JobTemplateField
): string {
  if (isEmptyValue(raw)) return "";

  if (typeof (raw as { toDate?: () => Date })?.toDate === "function") {
    try {
      const d = (raw as { toDate: () => Date }).toDate();
      if (!Number.isNaN(d.getTime())) {
        return new Intl.DateTimeFormat("cs-CZ").format(d);
      }
    } catch {
      /* ignore */
    }
  }

  if (typeof raw === "boolean") {
    return raw ? "Ano" : "Ne";
  }

  if (typeof raw === "number" && Number.isFinite(raw)) {
    return String(raw);
  }

  if (typeof raw === "string") {
    const s = raw.trim();
    if (field?.type === "checkbox") {
      const lower = s.toLowerCase();
      if (lower === "true" || s === "1") return "Ano";
      if (lower === "false" || s === "0") return "Ne";
    }
    if (field?.type === "select" && field.options?.length) {
      const opt = field.options.find((o) => o.value === s);
      if (opt) return opt.label;
    }
    return s;
  }

  if (Array.isArray(raw)) {
    const parts = raw
      .map((item) => formatTemplateValuePlain(item))
      .filter((x) => x.length > 0);
    return parts.join("\n");
  }

  if (typeof raw === "object" && raw !== null) {
    const entries = Object.entries(raw as Record<string, unknown>).filter(
      ([, v]) => !isEmptyValue(v)
    );
    if (!entries.length) return "";
    return entries
      .map(([k, v]) => {
        const inner = formatTemplateValuePlain(v);
        return inner ? `${humanizeRawKey(k)}: ${inner}` : "";
      })
      .filter(Boolean)
      .join("\n");
  }

  return String(raw).trim();
}

function humanizeRawKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
}

function getFieldValue(
  values: Record<string, unknown>,
  sectionId: string,
  fieldId: string
): unknown {
  const composite = `${sectionId}_${fieldId}`;
  if (values[composite] !== undefined) return values[composite];
  if (values[fieldId] !== undefined) return values[fieldId];
  return undefined;
}

/** Plain text pro {{data_sablony}} — sekce, prázdná pole přeskočena */
export function formatJobTemplateDataPlainText(
  template: JobTemplate | null | undefined,
  values: JobTemplateValues | Record<string, unknown> | null | undefined
): string {
  if (!values || typeof values !== "object") return "";

  const rec = values as Record<string, unknown>;

  if (template?.sections?.length) {
    const lines: string[] = [];
    const sections = [...template.sections].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0)
    );

    for (const section of sections) {
      const sectionLines: string[] = [];
      for (const field of section.fields || []) {
        const raw = getFieldValue(rec, section.id, field.id);
        if (isEmptyValue(raw)) continue;
        const display = formatTemplateValuePlain(raw, field);
        if (!display.trim()) continue;
        sectionLines.push(`${field.label}: ${display}`);
      }
      if (sectionLines.length) {
        if (lines.length) lines.push("");
        lines.push(section.name);
        lines.push(...sectionLines);
      }
    }
    const src = lines.join("\n").trim();
    if (src) return src;
  }

  // Fallback: šablona nenačtená, ale na zakázce jsou hodnoty
  const fallbackLines: string[] = [];
  for (const [key, val] of Object.entries(rec)) {
    if (isEmptyValue(val)) continue;
    const display = formatTemplateValuePlain(val);
    if (!display.trim()) continue;
    fallbackLines.push(`${humanizeRawKey(key)}: ${display}`);
  }
  return fallbackLines.join("\n").trim();
}

/** Má smlouva zobrazit sekci „Data šablony“? */
export function hasJobTemplateDataForContract(
  template: JobTemplate | null | undefined,
  values: JobTemplateValues | Record<string, unknown> | null | undefined
): boolean {
  return formatJobTemplateDataPlainText(template, values).length > 0;
}

/**
 * HTML sekce pro tisk/PDF (bez obalu článku sheet — jen vnitřek section).
 */
export function buildJobTemplateDataSectionInnerHtml(
  template: JobTemplate | null | undefined,
  values: JobTemplateValues | Record<string, unknown> | null | undefined
): string {
  if (!hasJobTemplateDataForContract(template, values)) return "";

  const rec = values as Record<string, unknown>;
  const blocks: string[] = [];

  if (template?.sections?.length) {
    const sections = [...template.sections].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0)
    );
    for (const section of sections) {
      const rows: string[] = [];
      for (const field of section.fields || []) {
        const raw = getFieldValue(rec, section.id, field.id);
        if (isEmptyValue(raw)) continue;
        const plain = formatTemplateValuePlain(raw, field);
        if (!plain.trim()) continue;
        const cellHtml = withLineBreaks(plain);
        rows.push(
          `<tr><td class="td-label">${escapeHtml(field.label)}</td><td class="td-val">${cellHtml}</td></tr>`
        );
      }
      if (rows.length) {
        blocks.push(
          `<div class="tmpl-subsec"><h4>${escapeHtml(section.name)}</h4><table class="tmpl-table" role="presentation">${rows.join("")}</table></div>`
        );
      }
    }
  } else {
    const rows: string[] = [];
    for (const [key, val] of Object.entries(rec)) {
      if (isEmptyValue(val)) continue;
      const plain = formatTemplateValuePlain(val);
      if (!plain.trim()) continue;
      rows.push(
        `<tr><td class="td-label">${escapeHtml(
          humanizeRawKey(key)
        )}</td><td class="td-val">${withLineBreaks(plain)}</td></tr>`
      );
    }
    if (rows.length) {
      blocks.push(
        `<div class="tmpl-subsec"><table class="tmpl-table" role="presentation">${rows.join("")}</table></div>`
      );
    }
  }

  if (!blocks.length) return "";

  const tmplTitle = template?.name?.trim()
    ? `<p class="tmpl-caption">${escapeHtml(template.name)}</p>`
    : "";

  return `<div class="template-data-inner">${tmplTitle}${blocks.join("")}</div>`;
}
