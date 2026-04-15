import { getText, printJsonOrText } from "../utils.ts";

export async function runReadCommand(baseUrl: string): Promise<void> {
  const body = await getText(baseUrl, "/album.json");
  printJsonOrText(body);
}
