import { generateTemplateImage } from "../image-generation/index.ts";
import { parseDimension } from "../image-generation/cli-options.ts";
import {
  getText,
  normalizeDeviceImagePath,
  optionalString,
  requiredString,
  toBoolean,
  type CliArgs,
} from "../utils.ts";

export async function runNotifyCommand(
  baseUrl: string,
  args: CliArgs,
): Promise<void> {
  const template = optionalString(args.template) ?? "notification";
  if (template !== "notification") {
    throw new Error(`unsupported template: ${template}`);
  }

  const title = requiredString(args.title, "title");
  const content = optionalString(args.content);
  const app = requiredString(args.app, "app");

  const width = parseDimension(optionalString(args.width), "width");
  const height = parseDimension(optionalString(args.height), "height");
  const raw = toBoolean(args.raw);

  const image = await generateTemplateImage({
    template: "notification",
    input: {
      title,
      content,
      app,
      width,
      height,
    },
  });

  const format = image.format;
  const extension = format === "jpeg" ? "jpg" : "gif";
  const remoteName =
    optionalString(args.name) ?? `notification-${Date.now()}.${extension}`;

  const mimeType = format === "jpeg" ? "image/jpeg" : "image/gif";
  const form = new FormData();
  form.append("file", new Blob([image.bytes], { type: mimeType }), remoteName);

  const uploadBody = await getText(baseUrl, "/doUpload?dir=%2Fimage", {
    method: "POST",
    body: form,
  });

  const search = new URLSearchParams({
    img: normalizeDeviceImagePath(remoteName),
  });
  const selectBody = await getText(baseUrl, `/set?${search.toString()}`);

  if (!raw) {
    console.log("OK");
    return;
  }

  console.log(
    JSON.stringify(
      {
        image: {
          name: remoteName,
          format,
          sizeBytes: image.bytes.byteLength,
        },
        upload: {
          summary: summarizeEndpointBody(
            uploadBody,
            normalizeDeviceImagePath(remoteName),
          ),
          raw: uploadBody,
        },
        select: {
          summary: summarizeEndpointBody(
            selectBody,
            normalizeDeviceImagePath(remoteName),
          ),
          raw: selectBody,
        },
      },
      null,
      2,
    ),
  );
}

function summarizeEndpointBody(value: string, expectedPath?: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: true, kind: "empty" };
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    // not json
  }

  if (trimmed.includes("<table") || trimmed.includes("<html")) {
    const imageMatches = [...trimmed.matchAll(/<a href='\/image\/([^']+)'/g)];
    const imageCount = imageMatches.length;
    const hasExpectedFile = expectedPath
      ? trimmed.includes(`href='${expectedPath}'`)
      : undefined;

    return {
      ok: true,
      kind: "html",
      summary: "device returned HTML",
      imageCount,
      ...(hasExpectedFile !== undefined ? { hasExpectedFile } : {}),
    };
  }

  return {
    ok: true,
    kind: "text",
    preview: truncate(trimmed, 180),
  };
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, Math.max(0, maxLength - 3))}...`;
}
