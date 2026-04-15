import { parseGIF, decompressFrames } from "gifuct-js";
import { createCanvas, loadImage } from "@napi-rs/canvas";

export type GlyphAppVisual = {
    kind: "glyph";
    glyph: string;
    background: string;
};

export type GifFrame = {
    rgba: Uint8ClampedArray;
    delayMs: number;
    width: number;
    height: number;
};

export type GifAppVisual = {
    kind: "gif";
    frames: GifFrame[];
};

export type JpgAppVisual = {
    kind: "jpg";
    rgba: Uint8ClampedArray;
    width: number;
    height: number;
};

export type AppVisual = GlyphAppVisual | GifAppVisual | JpgAppVisual;

type AppPreset =
    | {
        kind: "glyph";
        glyph: string;
        background: string;
    }
    | {
        kind: "gif";
        resourceFile: string;
    }
    | {
        kind: "jpg";
        resourceFile: string;
    };

const APP_PRESETS: Record<string, AppPreset> = {
    slack: { kind: "glyph", glyph: "S", background: "#ff3c00" },
    github: { kind: "glyph", glyph: "GH", background: "#004cff" },
    discord: { kind: "glyph", glyph: "D", background: "#5865F2" },
    notion: { kind: "glyph", glyph: "N", background: "#111111" },
    bomb: { kind: "gif", resourceFile: "Bomb.gif" },
    diamond: { kind: "gif", resourceFile: "Diamond.gif" },
    grassblock: { kind: "gif", resourceFile: "Grassblock.gif" },
};

export async function resolveAppVisual(appIdentifier: string): Promise<AppVisual> {
    const app = appIdentifier.trim().toLowerCase();
    const preset = APP_PRESETS[app];

    if (!preset) {
        return {
            kind: "glyph",
            glyph: appIdentifier.trim().slice(0, 2).toUpperCase() || "?",
            background: "#3e516b",
        };
    }

    if (preset.kind === "glyph") {
        return {
            kind: "glyph",
            glyph: preset.glyph,
            background: preset.background,
        };
    }

    if (preset.kind === "jpg") {
        return decodeJpgAppVisual(preset.resourceFile);
    }

    const gifUrl = new URL(`../../resources/${preset.resourceFile}`, import.meta.url);
    const bytes = await Bun.file(gifUrl).arrayBuffer();
    const parsed = parseGIF(bytes);
    const frames = decompressFrames(parsed, true);
    const width = parsed.lsd.width;
    const height = parsed.lsd.height;

    let frameBuffer = new Uint8ClampedArray(width * height * 4);
    const composedFrames: GifFrame[] = [];

    for (const frame of frames) {
        const backup = frame.disposalType === 3 ? frameBuffer.slice() : undefined;

        blitPatch(frameBuffer, frame.patch, frame.dims, width, height);

        composedFrames.push({
            rgba: frameBuffer.slice(),
            delayMs: normalizeDelay(frame.delay),
            width,
            height,
        });

        if (frame.disposalType === 2) {
            clearRect(frameBuffer, frame.dims, width, height);
        } else if (frame.disposalType === 3 && backup) {
            frameBuffer = backup;
        }
    }

    if (composedFrames.length === 0) {
        throw new Error(`GIF app preset '${appIdentifier}' has no decodable frames`);
    }

    return {
        kind: "gif",
        frames: composedFrames,
    };
}

async function decodeJpgAppVisual(resourceFile: string): Promise<JpgAppVisual> {
    const imageUrl = new URL(`../../resources/${resourceFile}`, import.meta.url);
    const image = await loadImage(imageUrl);
    const width = image.width;
    const height = image.height;

    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        throw new Error(`JPG app preset '${resourceFile}' has invalid dimensions`);
    }

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, width, height);

    return {
        kind: "jpg",
        rgba: ctx.getImageData(0, 0, width, height).data,
        width,
        height,
    };
}

function normalizeDelay(delay: number): number {
    if (!Number.isFinite(delay) || delay <= 0) {
        return 100;
    }
    return delay < 10 ? delay * 10 : delay;
}

function blitPatch(
    destinationRgba: Uint8ClampedArray,
    patch: Uint8ClampedArray,
    dims: { width: number; height: number; top: number; left: number },
    destinationWidth: number,
    destinationHeight: number,
): void {
    const { width, height, top, left } = dims;
    for (let y = 0; y < height; y += 1) {
        const dstY = top + y;
        if (dstY < 0 || dstY >= destinationHeight) {
            continue;
        }

        for (let x = 0; x < width; x += 1) {
            const dstX = left + x;
            if (dstX < 0 || dstX >= destinationWidth) {
                continue;
            }

            const srcIndex = (y * width + x) * 4;
            const alpha = patch[srcIndex + 3] ?? 0;
            if (alpha === 0) {
                continue;
            }

            const dstIndex = (dstY * destinationWidth + dstX) * 4;
            destinationRgba[dstIndex] = patch[srcIndex] ?? 0;
            destinationRgba[dstIndex + 1] = patch[srcIndex + 1] ?? 0;
            destinationRgba[dstIndex + 2] = patch[srcIndex + 2] ?? 0;
            destinationRgba[dstIndex + 3] = alpha;
        }
    }
}

function clearRect(
    rgba: Uint8ClampedArray,
    dims: { width: number; height: number; top: number; left: number },
    canvasWidth: number,
    canvasHeight: number,
): void {
    const { width, height, top, left } = dims;
    for (let y = 0; y < height; y += 1) {
        const targetY = top + y;
        if (targetY < 0 || targetY >= canvasHeight) {
            continue;
        }

        for (let x = 0; x < width; x += 1) {
            const targetX = left + x;
            if (targetX < 0 || targetX >= canvasWidth) {
                continue;
            }

            const idx = (targetY * canvasWidth + targetX) * 4;
            rgba[idx] = 0;
            rgba[idx + 1] = 0;
            rgba[idx + 2] = 0;
            rgba[idx + 3] = 0;
        }
    }
}
