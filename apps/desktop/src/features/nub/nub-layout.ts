import {
  currentMonitor,
  cursorPosition,
  getCurrentWindow,
  LogicalPosition,
  LogicalSize,
  type Monitor,
  monitorFromPoint,
  primaryMonitor,
} from "@tauri-apps/api/window";
import {
  collectObstacles,
  placeBelowObstacles,
  type Rect,
} from "@workspace/core";

import { listFloatingWindows } from "@/lib/native.js";

export type NubMode =
  | "recording"
  | "recording-transcript"
  | "ending"
  | "prompt"
  | "prompt-expanded";

interface Size {
  width: number;
  height: number;
}

export const NUB_PADDING = 6;
export const NUB_SIDE_GAP = 8;
export const PILL_SIZE: Size = { width: 48, height: 124 };
export const PROMPT_CARD_HEIGHT = 56;
const PROMPT_WIDTH = 400;
const PROMPT_EXPANDED_HEIGHT = 180;
const TRANSCRIPT_PANEL_SIZE: Size = { width: 320, height: 300 };
const ENDING_CARD_WIDTH = 280;

const withPadding = ({ width, height }: Size): Size => ({
  width: width + NUB_PADDING * 2,
  height: height + NUB_PADDING * 2,
});

const besidePill = (side: Size): Size =>
  withPadding({
    width: side.width + NUB_SIDE_GAP + PILL_SIZE.width,
    height: Math.max(side.height, PILL_SIZE.height),
  });

const SIZES: Record<NubMode, Size> = {
  recording: withPadding(PILL_SIZE),
  "recording-transcript": besidePill(TRANSCRIPT_PANEL_SIZE),
  ending: besidePill({ width: ENDING_CARD_WIDTH, height: PILL_SIZE.height }),
  prompt: { width: PROMPT_WIDTH, height: PROMPT_CARD_HEIGHT + NUB_PADDING * 2 },
  "prompt-expanded": { width: PROMPT_WIDTH, height: PROMPT_EXPANDED_HEIGHT },
};

const EDGE_MARGIN = 8;
const TOP_GAP = 4;
const RECORDING_TOP_RATIO = 0.38;
const DRAG_TOLERANCE = 2;

const isPrompt = (mode: NubMode) =>
  mode === "prompt" || mode === "prompt-expanded";

const findTargetMonitor = async (): Promise<Monitor | null> => {
  try {
    const cursor = await cursorPosition();
    const underCursor = await monitorFromPoint(cursor.x, cursor.y);
    if (underCursor) return underCursor;
  } catch {
    return (await currentMonitor()) ?? primaryMonitor();
  }
  return (await currentMonitor()) ?? primaryMonitor();
};

const toLogicalArea = (monitor: Monitor, useWorkArea: boolean): Rect => {
  const scale = monitor.scaleFactor;
  const position = useWorkArea ? monitor.workArea.position : monitor.position;
  const size = useWorkArea ? monitor.workArea.size : monitor.size;
  return {
    left: position.x / scale,
    top: position.y / scale,
    width: size.width / scale,
    height: size.height / scale,
  };
};

const anchorFor = (mode: NubMode, monitor: Monitor): Rect => {
  const size = SIZES[mode];
  const area = toLogicalArea(monitor, isPrompt(mode));
  const left = area.left + area.width - size.width - EDGE_MARGIN;
  const top = isPrompt(mode)
    ? area.top + TOP_GAP
    : area.top + area.height * RECORDING_TOP_RATIO;
  return { left, top, ...size };
};

const readObstacles = async (area: Rect) => {
  const windows = await listFloatingWindows().catch(() => []);
  return collectObstacles(
    windows.map(({ x, y, width, height, bundleId }) => ({
      left: x,
      top: y,
      width,
      height,
      bundleId,
    })),
    area,
  );
};

const placeNub = async (mode: NubMode, monitor: Monitor): Promise<Rect> => {
  const area = toLogicalArea(monitor, true);
  return placeBelowObstacles({
    rect: anchorFor(mode, monitor),
    obstacles: await readObstacles(area),
    area,
  });
};

const moveWindow = async (rect: Rect) => {
  const window = getCurrentWindow();
  await window.setSize(new LogicalSize(rect.width, rect.height));
  await window.setPosition(new LogicalPosition(rect.left, rect.top));
};

export const applyNubLayout = async (mode: NubMode): Promise<Rect | null> => {
  const monitor = await findTargetMonitor();
  if (!monitor) {
    const size = SIZES[mode];
    await getCurrentWindow().setSize(new LogicalSize(size.width, size.height));
    return null;
  }
  const rect = await placeNub(mode, monitor);
  await moveWindow(rect);
  return rect;
};

const isAt = (rect: Rect, left: number, top: number) =>
  Math.abs(rect.left - left) <= DRAG_TOLERANCE &&
  Math.abs(rect.top - top) <= DRAG_TOLERANCE;

const wasDragged = async (placed: Rect) => {
  const window = getCurrentWindow();
  const scale = await window.scaleFactor();
  const position = await window.outerPosition();
  return !isAt(placed, position.x / scale, position.y / scale);
};

export const refreshNubPosition = async (
  mode: NubMode,
  placed: Rect,
): Promise<Rect | null> => {
  if (await wasDragged(placed)) return null;
  const monitor = await currentMonitor();
  if (!monitor) return placed;
  const next = await placeNub(mode, monitor);
  if (isAt(placed, next.left, next.top)) return placed;
  await moveWindow(next);
  return next;
};
