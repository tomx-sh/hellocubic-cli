export function wrapText(
  text: string,
  maxCharsPerLine: number,
  maxLines: number,
): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [];
  }

  const words = normalized.split(" ");
  const lines: string[] = [];
  let current = "";
  let truncated = false;

  for (const word of words) {
    const candidate = current.length === 0 ? word : `${current} ${word}`;
    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
      continue;
    }

    if (current.length > 0) {
      lines.push(current);
      current = word;
    } else {
      lines.push(word.slice(0, maxCharsPerLine));
      current = word.slice(maxCharsPerLine);
    }

    if (lines.length === maxLines) {
      truncated = true;
      break;
    }
  }

  if (current.length > 0 && lines.length < maxLines) {
    lines.push(current);
  }

  if (truncated && lines.length > 0) {
    const lastLineIndex = lines.length - 1;
    const originalLast = lines[lastLineIndex] ?? "";
    if (originalLast.length >= 3) {
      lines[lastLineIndex] = `${originalLast.slice(0, -3)}...`;
    }
  }

  return lines;
}
