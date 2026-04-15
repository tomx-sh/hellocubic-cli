import { basename } from "node:path";
import {
  getText,
  optionalString,
  printJsonOrText,
  requiredString,
  fail,
  type CliArgs,
} from "../utils.ts";

export async function runUploadImageCommand(
  baseUrl: string,
  args: CliArgs,
): Promise<void> {
  const filePath = requiredString(args.file, "file");
  const uploadName = optionalString(args.name) ?? basename(filePath);
  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    fail(`local file does not exist: ${filePath}`);
  }

  const form = new FormData();
  form.append("file", file, uploadName);

  const body = await getText(baseUrl, "/doUpload?dir=%2Fimage", {
    method: "POST",
    body: form,
  });
  printJsonOrText(body);
}
