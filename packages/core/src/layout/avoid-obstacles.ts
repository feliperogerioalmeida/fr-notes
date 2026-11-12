export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ScreenWindowRect extends Rect {
  bundleId: string | null;
}

export const OBSTACLE_GAP = 8;
const NOTIFICATION_CENTER_BUNDLE_ID = "com.apple.notificationcenterui";
const BANNER_WIDTH = 380;
const BANNER_HEIGHT = 120;
const MENU_BAR_TOLERANCE = 2;
const MAX_OBSTACLE_WIDTH = 720;
const MAX_OBSTACLE_HEIGHT = 600;

const intersects = (first: Rect, second: Rect) =>
  first.left < second.left + second.width &&
  second.left < first.left + first.width &&
  first.top < second.top + second.height &&
  second.top < first.top + first.height;

const isObstacle = (window: Rect, area: Rect) =>
  window.top >= area.top - MENU_BAR_TOLERANCE &&
  window.width <= MAX_OBSTACLE_WIDTH &&
  window.height <= MAX_OBSTACLE_HEIGHT &&
  intersects(window, area);

interface PlaceBelowObstaclesInput {
  rect: Rect;
  obstacles: Rect[];
  area: Rect;
  gap?: number;
}

export const placeBelowObstacles = ({
  rect,
  obstacles,
  area,
  gap = OBSTACLE_GAP,
}: PlaceBelowObstaclesInput): Rect => {
  const relevant = obstacles.filter((window) => isObstacle(window, area));
  const placed = relevant.reduce<Rect>((current) => {
    const blocker = relevant.find((window) => intersects(window, current));
    if (!blocker) return current;
    return { ...current, top: blocker.top + blocker.height + gap };
  }, rect);
  const fits = placed.top + placed.height <= area.top + area.height;
  const isClear = !relevant.some((window) => intersects(window, placed));
  return fits && isClear ? placed : rect;
};

const toBannerRect = (area: Rect): Rect => ({
  left: area.left + area.width - BANNER_WIDTH,
  top: area.top,
  width: BANNER_WIDTH,
  height: BANNER_HEIGHT,
});

export const collectObstacles = (
  windows: ScreenWindowRect[],
  area: Rect,
): Rect[] =>
  windows.map(({ bundleId, ...rect }) =>
    bundleId === NOTIFICATION_CENTER_BUNDLE_ID ? toBannerRect(area) : rect,
  );
