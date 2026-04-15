import { dirname, resolve } from "node:path";
import { mkdir } from "node:fs/promises";
import { parseDimension } from "../image-generation/cli-options.ts";
import { generateTemplateImage } from "../image-generation/index.ts";
import {
  fail,
  optionalString,
  requiredString,
  type CliArgs,
} from "../utils.ts";

export async function runGenerateImageCommand(args: CliArgs): Promise<void> {
  const templateArg = requiredString(args.template, "template");
  if (templateArg !== "notification") {
    fail(`unsupported template: ${templateArg}`);
  }
  const template: "notification" = "notification";

  const title = requiredString(args.title, "title");
  const content = optionalString(args.content);
  const app = requiredString(args.app, "app");

  const width = parseDimension(optionalString(args.width), "width");
  const height = parseDimension(optionalString(args.height), "height");
  const image = await generateTemplateImage({
    template,
    input: {
      title,
      content,
      app,
      width,
      height,
    },
  });
  const extension = image.format === "jpeg" ? "jpg" : "gif";
  const outputPath = resolve(
    optionalString(args.out) ?? `./generated/${template}-${Date.now()}.${extension}`,
  );
  await mkdir(dirname(outputPath), { recursive: true });

  await Bun.write(outputPath, image.bytes);
  console.log(
    JSON.stringify(
      {
        template,
        format: image.format,
        output: outputPath,
        sizeBytes: image.bytes.byteLength,
      },
      null,
      2,
    ),
  );
}
