import { basename } from "node:path";
import { getText, normalizeDeviceImagePath, printJsonOrText } from "../utils.ts";

const PRESERVED_FILE_PATTERNS: ReadonlyArray<RegExp> = [
  /^bg\.[^/]+$/i,
  /^background\.[^/]+$/i,
];
const PREFERRED_BACKGROUND_PATTERN = /^background\.[^/]+$/i;
const FALLBACK_BACKGROUND_PATTERN = /^bg\.[^/]+$/i;

type FileListEntry = string | { name?: string; path?: string; file?: string };

export async function runClearCommand(baseUrl: string): Promise<void> {
  const fileListBody = await getText(baseUrl, "/filelist?dir=%2Fimage");
  const imagePaths = parseImagePaths(fileListBody);
  const preservedPaths = imagePaths.filter(isPreservedPath);

  const filesToDelete = imagePaths.filter((imagePath) => !isPreservedPath(imagePath));

  let deletedCount = 0;

  for (const imagePath of filesToDelete) {
    const search = new URLSearchParams({
      file: normalizeDeviceImagePath(imagePath),
    });
    await getText(baseUrl, `/delete?${search.toString()}`);
    deletedCount += 1;
  }

  const selectedImage = pickBackgroundPath(preservedPaths);
  if (selectedImage) {
    const search = new URLSearchParams({ img: selectedImage });
    await getText(baseUrl, `/set?${search.toString()}`);
  }

  printJsonOrText(
    JSON.stringify({
      deleted: deletedCount,
      preserved: preservedPaths.length,
      total: imagePaths.length,
      selectedImage: selectedImage ?? null,
    }),
  );
}

function parseImagePaths(body: string): string[] {
  const parsed = safeParseJson(body);
  if (parsed !== undefined) {
    const root = Array.isArray(parsed) ? parsed : getLikelyListContainer(parsed);
    if (Array.isArray(root)) {
      return normalizeAndDedupeImagePaths(root.map((entry) => getEntryPath(entry as FileListEntry)));
    }
  }

  const plainTextPaths = parseImagePathsFromText(body);
  if (plainTextPaths.length > 0) {
    return plainTextPaths;
  }

  throw new Error("clear could not find any image paths in /filelist response");
}

function safeParseJson(body: string): unknown | undefined {
  try {
    return JSON.parse(body.trim());
  } catch {
    return undefined;
  }
}

function getLikelyListContainer(value: unknown): unknown[] | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const candidates = [record.filelist, record.files, record.list, record.data];
  return candidates.find((candidate): candidate is unknown[] =>
    Array.isArray(candidate),
  );
}

function getEntryPath(entry: FileListEntry): string | undefined {
  if (typeof entry === "string") {
    return entry;
  }

  if (!entry || typeof entry !== "object") {
    return undefined;
  }

  return entry.path ?? entry.name ?? entry.file;
}

function parseImagePathsFromText(body: string): string[] {
  const trimmed = body.trim();
  if (!trimmed) {
    return [];
  }

  const htmlMatches = Array.from(
    trimmed.matchAll(/href=['"]([^'"]*\/image\/[^'"]+)['"]/gi),
    (match) => match[1],
  );
  if (htmlMatches.length > 0) {
    return normalizeAndDedupeImagePaths(htmlMatches);
  }

  const slashImageMatches = Array.from(
    trimmed.matchAll(/(?:^|[\s"'<>])((?:https?:\/\/[^\s"'<>]+)?\/image\/[^\s"'<>]+)/gi),
    (match) => match[1],
  );
  if (slashImageMatches.length > 0) {
    return normalizeAndDedupeImagePaths(slashImageMatches);
  }

  const lineCandidates = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => /^[^/\\]+\.[^/\\.\s]+$/.test(line));

  return normalizeAndDedupeImagePaths(lineCandidates);
}

function normalizeAndDedupeImagePaths(
  values: Array<string | undefined>,
): string[] {
  const deduped = new Set<string>();

  for (const value of values) {
    if (!value) {
      continue;
    }

    let normalized = value.trim();
    if (!normalized) {
      continue;
    }

    try {
      const parsedUrl = new URL(normalized);
      normalized = parsedUrl.pathname;
    } catch {
      // Not a URL; keep as-is.
    }

    deduped.add(normalizeDeviceImagePath(normalized));
  }

  return Array.from(deduped);
}

function isPreservedPath(imagePath: string): boolean {
  const fileName = basename(imagePath);
  return PRESERVED_FILE_PATTERNS.some((pattern) => pattern.test(fileName));
}

function pickBackgroundPath(paths: string[]): string | undefined {
  const sorted = [...paths].sort((a, b) => a.localeCompare(b));

  return (
    sorted.find((path) => PREFERRED_BACKGROUND_PATTERN.test(basename(path))) ??
    sorted.find((path) => FALLBACK_BACKGROUND_PATTERN.test(basename(path)))
  );
}
