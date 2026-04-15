import { getText, printJsonOrText } from "../utils.ts";

export async function runClearAllImagesCommand(baseUrl: string): Promise<void> {
  const body = await getText(baseUrl, "/set?clear=image");
  printJsonOrText(body);
}
