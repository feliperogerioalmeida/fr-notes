import {
  currentMonitor,
  getCurrentWindow,
  LogicalPosition,
  LogicalSize,
} from "@tauri-apps/api/window";

export type NubMode = "recording" | "prompt";

const SIZES: Record<NubMode, { width: number; height: number }> = {
  recording: { width: 64, height: 168 },
  prompt: { width: 400, height: 84 },
};

const EDGE_MARGIN = 12;
const TOP_RATIO = 0.38;

export const applyNubLayout = async (mode: NubMode): Promise<void> => {
  const window = getCurrentWindow();
  const size = SIZES[mode];
  await window.setSize(new LogicalSize(size.width, size.height));
  const monitor = await currentMonitor();
  if (!monitor) return;
  const scale = monitor.scaleFactor;
  const left = monitor.position.x / scale;
  const top = monitor.position.y / scale;
  const width = monitor.size.width / scale;
  const height = monitor.size.height / scale;
  await window.setPosition(
    new LogicalPosition(
      left + width - size.width - EDGE_MARGIN,
      top + height * TOP_RATIO,
    ),
  );
};
