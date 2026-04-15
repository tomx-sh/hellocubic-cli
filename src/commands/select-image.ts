import {
  getText,
  normalizeDeviceImagePath,
  printJsonOrText,
  requiredString,
  type CliArgs,
} from "../utils.ts";

export async function runSelectImageCommand(
  baseUrl: string,
  args: CliArgs,
): Promise<void> {
  const name = requiredString(args.name, "name");
  const search = new URLSearchParams({ img: normalizeDeviceImagePath(name) });
  const body = await getText(baseUrl, `/set?${search.toString()}`);
  printJsonOrText(body);
}
