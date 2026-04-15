import { getText, printJsonOrText } from "../utils.ts";

export async function runListImagesCommand(baseUrl: string): Promise<void> {
  const body = await getText(baseUrl, "/filelist?dir=%2Fimage");
  printJsonOrText(body);
}
