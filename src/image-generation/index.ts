import { renderNotificationTemplate } from "./templates/notification.ts";
import type { GenerateTemplateRequest, GeneratedTemplateImage } from "./types.ts";

export async function generateTemplateImage(
  request: GenerateTemplateRequest,
): Promise<GeneratedTemplateImage> {
  if (request.template === "notification") {
    return renderNotificationTemplate(request.input);
  }

  throw new Error(`unsupported template: ${String(request.template)}`);
}
