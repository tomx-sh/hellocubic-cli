import { parse } from "@bomb.sh/args";

export type Command =
  | "read"
  | "set"
  | "list-images"
  | "upload-image"
  | "select-image"
  | "delete-file"
  | "clear-images"
  | "help";

export type CliArgs = {
  _: Array<string | number | boolean>;
  help?: unknown;
  h?: unknown;
  ip?: unknown;
  i?: unknown;
  autoplay?: unknown;
  interval?: unknown;
  file?: unknown;
  name?: unknown;
};

export const helpText = `
hellocubic-cli

Usage:
  bun run src/index.ts <command> --ip <ip_or_host>

Commands:
  read
    GET /album.json

  set --autoplay <0|1> --interval <seconds>
    GET /set?autoplay=<0|1>&i_i=<seconds>
    (at least one of --autoplay or --interval is required)

  list-images
    GET /filelist?dir=/image

  upload-image --file <path> [--name <remote_name>]
    POST /doUpload?dir=/image

  select-image --name <filename>
    GET /set?img=<urlencoded_filename>

  delete-file --file <path_or_name>
    GET /delete?file=<urlencoded_path_or_name>

  clear-images
    GET /set?clear=image

Global options:
  --ip, -i     Device IP/host (example: 192.168.1.42 or http://192.168.1.42)
  --help, -h   Show help
`.trim();

export function parseCliArgs(argv: string[]): CliArgs {
  return parse(argv, {
    alias: {
      h: "help",
      i: "ip",
    },
    string: ["ip", "file", "name", "autoplay", "interval"],
    boolean: ["help"],
  }) as CliArgs;
}

export function fail(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}

export function toBoolean(value: unknown): boolean {
  return value === true;
}

export function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function requiredString(value: unknown, name: string): string {
  const parsed = optionalString(value);
  if (!parsed) {
    fail(`missing --${name}`);
  }
  return parsed;
}

export function normalizeBaseUrl(input: string): string {
  const prefixed = /^https?:\/\//i.test(input) ? input : `http://${input}`;
  const normalized = prefixed.replace(/\/+$/, "");
  try {
    const url = new URL(normalized);
    if (!url.hostname) {
      fail(`invalid --ip value: ${input}`);
    }
  } catch {
    fail(`invalid --ip value: ${input}`);
  }
  return normalized;
}

export function optionalAutoplay(value: unknown): 0 | 1 | undefined {
  const str = optionalString(value);
  if (str === undefined) {
    return undefined;
  }
  if (str !== "0" && str !== "1") {
    fail("--autoplay must be 0 or 1");
  }
  return Number(str) as 0 | 1;
}

export function optionalInterval(value: unknown): number | undefined {
  const str = optionalString(value);
  if (str === undefined) {
    return undefined;
  }
  const parsed = Number(str);
  if (!Number.isInteger(parsed) || parsed < 0) {
    fail("--interval must be a non-negative integer (seconds)");
  }
  return parsed;
}

export async function getText(
  baseUrl: string,
  path: string,
  init?: RequestInit,
): Promise<string> {
  const response = await fetch(`${baseUrl}${path}`, init);
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} on ${path}: ${body}`);
  }

  return body;
}

export function printJsonOrText(body: string): void {
  const trimmed = body.trim();
  if (!trimmed) {
    console.log("");
    return;
  }

  try {
    const json = JSON.parse(trimmed);
    console.log(JSON.stringify(json, null, 2));
  } catch {
    console.log(trimmed);
  }
}
