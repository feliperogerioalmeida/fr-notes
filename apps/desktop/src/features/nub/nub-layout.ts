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

export type NubMode = "recording" | "prompt" | "prompt-expanded";

const PROMPT_WIDTH = 470;

const SIZES: Record<NubMode, { width: number; height: number }> = {
  recording: { width: 64, height: 168 },
  prompt: { width: PROMPT_WIDTH, height: 84 },
  "prompt-expanded": { width: PROMPT_WIDTH, height: 206 },
};

const EDGE_MARGIN = 8;
const TOP_GAP = 4;
const RECORDING_TOP_RATIO = 0.38;

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

interface Area {
  left: number;
  top: number;
  width: number;
  height: number;
}

const toLogicalArea = (monitor: Monitor, useWorkArea: boolean): Area => {
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

const originFor = (mode: NubMode, area: Area) => {
  const size = SIZES[mode];
  const left = area.left + area.width - size.width - EDGE_MARGIN;
  if (mode === "recording") {
    return { left, top: area.top + area.height * RECORDING_TOP_RATIO };
  }
  return { left, top: area.top + TOP_GAP };
};

export const applyNubLayout = async (mode: NubMode): Promise<void> => {
  const window = getCurrentWindow();
  const size = SIZES[mode];
  await window.setSize(new LogicalSize(size.width, size.height));
  const monitor = await findTargetMonitor();
  if (!monitor) return;
  const origin = originFor(mode, toLogicalArea(monitor, mode !== "recording"));
  await window.setPosition(new LogicalPosition(origin.left, origin.top));
};
