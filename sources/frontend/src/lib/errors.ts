export function cleanDbErrorMessage(raw: unknown): string {
  if (!raw) return "Something went wrong. Please try again.";

  let msg = String(raw).trim();

  // Extract between last ']' and last '(' if it looks like SQL format
  const lastBracket = msg.lastIndexOf("]");
  const lastParen = msg.lastIndexOf("(");

  if (lastBracket !== -1 && lastParen !== -1 && lastParen > lastBracket) {
    msg = msg.substring(lastBracket + 1, lastParen).trim();
  }

  // Remove trailing "(12345)" error codes
  msg = msg.replace(/\(\d+\)\s*$/, "").trim();

  // Remove any trailing bracketed driver tags like "[SQL Server]"
  msg = msg.replace(/\[.*?\]\s*/g, "").trim();

  // As extra safety: if message still contains ODBC boilerplate, try to clean again
  const tupleIndex = msg.indexOf("] ");
  if (tupleIndex !== -1) {
    msg = msg.substring(tupleIndex + 2).trim();
  }

  return msg;
}
