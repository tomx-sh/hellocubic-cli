#!/usr/bin/env bun
import { runClearAllImagesCommand } from "./commands/clear-all-images.ts";
import { runClearCommand } from "./commands/clear.ts";
import { runDeleteFileCommand } from "./commands/delete-file.ts";
import { runGenerateImageCommand } from "./commands/generate-image.ts";
import { runListImagesCommand } from "./commands/list-images.ts";
import { runNotifyCommand } from "./commands/notify.ts";
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

const requiresDeviceIp: ReadonlySet<Command> = new Set([
  "read",
  "set",
  "list-images",
  "upload-image",
  "select-image",
  "delete-file",
  "clear",
  "clear-all-images",
  "notify",
]);

try {
  const baseUrl = requiresDeviceIp.has(command)
    ? normalizeBaseUrl(requiredString(args.ip, "ip"))
    : "";

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
    case "clear":
      await runClearCommand(baseUrl);
      break;
    case "clear-all-images":
      await runClearAllImagesCommand(baseUrl);
      break;
    case "generate-image":
      await runGenerateImageCommand(args);
      break;
    case "notify":
      await runNotifyCommand(baseUrl, args);
      break;
    default:
      fail(`unknown command: ${String(command)}`);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  fail(message);
}
