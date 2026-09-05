// test-only helpers re-exported from lib (keeps vitest surface minimal)
export { formatMs, renderMath } from "./utils";

export function stemTextSafe(stem: string, max = 15): string {
  return stem.replace(/\$[^$]+\$/g, "…").replace(/\s+/g, " ").slice(0, max);
}
