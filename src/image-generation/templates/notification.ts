import {
    createCanvas,
    ImageData,
    type SKRSContext2D,
} from "@napi-rs/canvas";
import { GIFEncoder, applyPalette, quantize } from "gifenc";
import { resolveAppVisual } from "../apps.ts";
import type { GeneratedTemplateImage, NotificationTemplateInput } from "../types.ts";

const DEFAULT_WIDTH = 240;
const DEFAULT_HEIGHT = 240;

export async function renderNotificationTemplate(
    input: NotificationTemplateInput,
): Promise<GeneratedTemplateImage> {
    const width = sanitizeDimension(input.width, DEFAULT_WIDTH);
    const height = sanitizeDimension(input.height, DEFAULT_HEIGHT);
    const appVisual = await resolveAppVisual(input.app);

    if (appVisual.kind !== "gif") {
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext("2d");
        drawNotificationFrame(ctx, input, appVisual, width, height, 0);
        return {
            bytes: await canvas.encode("jpeg"),
            format: "jpeg",
        };
    }

    const frames =
        appVisual.kind === "gif"
            ? appVisual.frames.map((frame, index) => ({
                delayMs: frame.delayMs,
                rgba: buildFrameRgba(input, appVisual, width, height, index),
            }))
            : [
                {
                    delayMs: 1000,
                    rgba: buildFrameRgba(input, appVisual, width, height, 0),
                },
            ];

    const gif = GIFEncoder();
    for (const frame of frames) {
        const palette = quantize(frame.rgba, 256);
        const indexed = applyPalette(frame.rgba, palette);
        gif.writeFrame(indexed, width, height, {
            palette,
            delay: frame.delayMs,
            repeat: 0,
        });
    }

    gif.finish();
    return {
        bytes: gif.bytes(),
        format: "gif",
    };
}

function buildFrameRgba(
    input: NotificationTemplateInput,
    appVisual: Awaited<ReturnType<typeof resolveAppVisual>>,
    width: number,
    height: number,
    frameIndex: number,
): Uint8ClampedArray {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    drawNotificationFrame(ctx, input, appVisual, width, height, frameIndex);
    return ctx.getImageData(0, 0, width, height).data;
}

function drawNotificationFrame(
    ctx: SKRSContext2D,
    input: NotificationTemplateInput,
    appVisual: Awaited<ReturnType<typeof resolveAppVisual>>,
    width: number,
    height: number,
    frameIndex: number,
): void {
    const outerMargin = Math.round(width * 0.03);
    const textGap = Math.round(height * 0.035);
    const titleFontSize = Math.max(16, Math.round(width * 0.18));
    const contentFontSize = Math.max(13, Math.round(width * 0.124));
    const hasContent = Boolean(input.content?.trim());

    const titleY = hasContent
        ? height - outerMargin - contentFontSize - textGap
        : height - outerMargin;
    const contentY = height - outerMargin;

    const visualBottom = titleY - titleFontSize - textGap;
    const maxVisualHeight = Math.max(24, visualBottom - outerMargin);
    const iconSize = Math.max(24, Math.min(width - outerMargin * 2, maxVisualHeight));
    const iconX = Math.round((width - iconSize) / 2);
    const iconY = outerMargin;

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);

    drawAppVisual(ctx, appVisual, iconX, iconY, iconSize, frameIndex);

    ctx.fillStyle = "#ffffff";
    ctx.font = `${titleFontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    const titleLine = truncateLine(input.title.trim(), 20);
    ctx.fillText(titleLine, Math.round(width / 2), titleY);

    if (hasContent) {
        ctx.fillStyle = "#dfdfdf";
        ctx.font = `${contentFontSize}px sans-serif`;
        const contentMaxWidth = width - outerMargin * 2;
        const contentLine = fitLineToWidth(ctx, input.content ?? "", contentMaxWidth);
        ctx.fillText(contentLine, Math.round(width / 2), contentY);
    }
    ctx.textAlign = "start";
}

function drawAppVisual(
    ctx: SKRSContext2D,
    appVisual: Awaited<ReturnType<typeof resolveAppVisual>>,
    x: number,
    y: number,
    size: number,
    frameIndex: number,
): void {
    if (appVisual.kind === "glyph") {
        ctx.fillStyle = appVisual.background;
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `${Math.round(size * 0.4)}px sans-serif`;
        ctx.fillText(appVisual.glyph, x + size / 2, y + size / 2);
        ctx.textAlign = "start";
        ctx.textBaseline = "alphabetic";
        return;
    }

    if (appVisual.kind === "jpg") {
        const frameCanvas = createCanvas(appVisual.width, appVisual.height);
        const frameCtx = frameCanvas.getContext("2d");
        frameCtx.putImageData(
            new ImageData(appVisual.rgba, appVisual.width, appVisual.height),
            0,
            0,
        );
        ctx.drawImage(frameCanvas, x, y, size, size);
        return;
    }

    const gifFrame = appVisual.frames[frameIndex % appVisual.frames.length];
    if (!gifFrame) {
        throw new Error("GIF app visual has no frame to render");
    }
    const frameCanvas = createCanvas(gifFrame.width, gifFrame.height);
    const frameCtx = frameCanvas.getContext("2d");
    frameCtx.putImageData(
        new ImageData(gifFrame.rgba, gifFrame.width, gifFrame.height),
        0,
        0,
    );

    ctx.drawImage(frameCanvas, x, y, size, size);
}

function truncateLine(text: string, maxChars: number): string {
    if (text.length <= maxChars) {
        return text;
    }
    return `${text.slice(0, Math.max(0, maxChars - 3))}...`;
}

function fitLineToWidth(
    ctx: SKRSContext2D,
    text: string,
    maxWidth: number,
): string {
    const normalized = text.replace(/\s+/g, " ").trim();
    if (normalized.length === 0) {
        return "";
    }
    if (ctx.measureText(normalized).width <= maxWidth) {
        return normalized;
    }

    const ellipsis = "...";
    const ellipsisWidth = ctx.measureText(ellipsis).width;
    if (ellipsisWidth > maxWidth) {
        return "";
    }

    let low = 0;
    let high = normalized.length;
    let best = "";

    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const candidate = `${normalized.slice(0, mid).trimEnd()}${ellipsis}`;
        if (ctx.measureText(candidate).width <= maxWidth) {
            best = candidate;
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }

    return best || ellipsis;
}

function sanitizeDimension(
    value: number | undefined,
    fallback: number,
): number {
    if (typeof value !== "number") {
        return fallback;
    }
    if (!Number.isInteger(value) || value < 64 || value > 1024) {
        throw new Error("width/height must be an integer between 64 and 1024");
    }
    return value;
}
