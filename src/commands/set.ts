import {
  fail,
  getText,
  optionalAutoplay,
  optionalInterval,
  printJsonOrText,
  type CliArgs,
} from "../utils.ts";

export async function runSetCommand(
  baseUrl: string,
  args: CliArgs,
): Promise<void> {
  const autoplay = optionalAutoplay(args.autoplay);
  const interval = optionalInterval(args.interval);
  if (autoplay === undefined && interval === undefined) {
    fail("set requires at least one of --autoplay or --interval");
  }

  const search = new URLSearchParams();
  if (autoplay !== undefined) {
    search.set("autoplay", String(autoplay));
  }
  if (interval !== undefined) {
    search.set("i_i", String(interval));
  }

  const body = await getText(baseUrl, `/set?${search.toString()}`);
  printJsonOrText(body);
}
