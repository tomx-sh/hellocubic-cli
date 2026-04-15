import { fail } from "../utils.ts";

export function parseDimension(
  value: string | undefined,
  field: string,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 64 || parsed > 1024) {
    fail(`--${field} must be an integer between 64 and 1024`);
  }
  return parsed;
}
