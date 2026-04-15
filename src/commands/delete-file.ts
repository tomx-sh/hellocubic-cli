import {
  getText,
  printJsonOrText,
  requiredString,
  type CliArgs,
} from "../utils.ts";

export async function runDeleteFileCommand(
  baseUrl: string,
  args: CliArgs,
): Promise<void> {
  const file = requiredString(args.file, "file");
  const search = new URLSearchParams({ file });
  const body = await getText(baseUrl, `/delete?${search.toString()}`);
  printJsonOrText(body);
}
