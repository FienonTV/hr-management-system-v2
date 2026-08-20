import type { CustomFieldType, Prisma } from "@prisma/client";

export function serializeProjectCustomValue(
  fieldType: CustomFieldType,
  value: unknown
): {
  valueText?: string | null;
  valueNumber?: number | null;
  valueDate?: Date | null;
  valueBoolean?: boolean | null;
  valueJson?: Prisma.InputJsonValue;
} {
  switch (fieldType) {
    case "TEXT":
      return { valueText: value == null ? null : String(value) };
    case "NUMBER":
      return { valueNumber: value == null || value === "" ? null : Number(value) };
    case "DATE":
      return { valueDate: value == null || value === "" ? null : new Date(value as string) };
    case "BOOLEAN":
      return { valueBoolean: value === true || value === "true" || value === 1 };
    case "SELECT":
      return value != null
        ? { valueText: String(value), valueJson: { value } as Prisma.InputJsonValue }
        : { valueText: null };
    case "MULTI_SELECT":
      return value == null
        ? {}
        : { valueJson: { values: Array.isArray(value) ? value : [value] } as Prisma.InputJsonValue };
    default:
      return { valueText: value == null ? null : String(value) };
  }
}

export function deserializeProjectCustomValue(
  fieldType: CustomFieldType,
  row: {
    valueText: string | null;
    valueNumber: Prisma.Decimal | number | null;
    valueDate: Date | null;
    valueBoolean: boolean | null;
    valueJson: Prisma.JsonValue | null;
  }
): unknown {
  switch (fieldType) {
    case "TEXT":
      return row.valueText;
    case "NUMBER":
      return row.valueNumber == null ? null : Number(row.valueNumber);
    case "DATE":
      return row.valueDate;
    case "BOOLEAN":
      return row.valueBoolean;
    case "SELECT":
      if (row.valueJson && typeof row.valueJson === "object" && (row.valueJson as any).value !== undefined) {
        return (row.valueJson as any).value;
      }
      return row.valueText;
    case "MULTI_SELECT":
      if (row.valueJson && typeof row.valueJson === "object" && Array.isArray((row.valueJson as any).values)) {
        return (row.valueJson as any).values;
      }
      return [];
    default:
      return row.valueText;
  }
}
