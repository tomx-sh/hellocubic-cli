#!/usr/bin/env bun
import { runClearImagesCommand } from "./commands/clear-images.ts";
import { runDeleteFileCommand } from "./commands/delete-file.ts";
import { runListImagesCommand } from "./commands/list-images.ts";
import { runReadCommand } from "./commands/read.ts";
import { runSelectImageCommand } from "./commands/select-image.ts";
import { runSetCommand } from "./commands/set.ts";
import { runUploadImageCommand } from "./commands/upload-image.ts";
import {
  fail,
  helpText,
  normalizeBaseUrl,
  parseCliArgs,
  requiredString,
  toBoolean,
  type Command,
} from "./utils.ts";

const args = parseCliArgs(Bun.argv.slice(2));
const command = (args._[0] ?? "help") as Command;

if (toBoolean(args.help) || command === "help") {
  console.log(helpText);
  process.exit(0);
}

const ip = requiredString(args.ip, "ip");
const baseUrl = normalizeBaseUrl(ip);

try {
  switch (command) {
    case "read":
      await runReadCommand(baseUrl);
      break;
    case "set":
      await runSetCommand(baseUrl, args);
      break;
    case "list-images":
      await runListImagesCommand(baseUrl);
      break;
    case "upload-image":
      await runUploadImageCommand(baseUrl, args);
      break;
    case "select-image":
      await runSelectImageCommand(baseUrl, args);
      break;
    case "delete-file":
      await runDeleteFileCommand(baseUrl, args);
      break;
    case "clear-images":
      await runClearImagesCommand(baseUrl);
      break;
    default:
      fail(`unknown command: ${String(command)}`);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  fail(message);
}
