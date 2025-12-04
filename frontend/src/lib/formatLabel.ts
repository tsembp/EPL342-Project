/**
 * Formats underscore-separated strings to Title Case
 * Example: "bridged_route" -> "Bridged Route"
 */
export function formatLabel(value: string): string {
  if (!value) return "";
  return value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
