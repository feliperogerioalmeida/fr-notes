import { describe, expect, it } from "vitest";

import {
  collectObstacles,
  placeBelowObstacles,
  type Rect,
} from "./avoid-obstacles.js";

const AREA: Rect = { left: 0, top: 39, width: 1800, height: 1130 };
const CARD: Rect = { left: 1392, top: 43, width: 400, height: 68 };

describe("placeBelowObstacles", () => {
  it("keeps the card in place when the corner is free", () => {
    expect(
      placeBelowObstacles({ rect: CARD, obstacles: [], area: AREA }),
    ).toEqual(CARD);
  });

  it("moves below a notification already in the corner", () => {
    const banner = { left: 1430, top: 47, width: 360, height: 80 };
    expect(
      placeBelowObstacles({ rect: CARD, obstacles: [banner], area: AREA }).top,
    ).toBe(135);
  });

  it("clears a stack of notifications", () => {
    const obstacles = [
      { left: 1430, top: 47, width: 360, height: 80 },
      { left: 1430, top: 135, width: 360, height: 80 },
    ];
    expect(placeBelowObstacles({ rect: CARD, obstacles, area: AREA }).top).toBe(
      223,
    );
  });

  it("ignores the menu bar and oversized invisible panels", () => {
    const obstacles = [
      { left: 0, top: 0, width: 1800, height: 44 },
      { left: 1396, top: -361, width: 404, height: 1204 },
      { left: 1300, top: 60, width: 500, height: 900 },
    ];
    expect(placeBelowObstacles({ rect: CARD, obstacles, area: AREA })).toEqual(
      CARD,
    );
  });

  it("ignores windows on the other side of the screen", () => {
    const widget = { left: 8, top: 47, width: 360, height: 180 };
    expect(
      placeBelowObstacles({ rect: CARD, obstacles: [widget], area: AREA }),
    ).toEqual(CARD);
  });

  it("stays put when there is no room below", () => {
    const tall = { left: 1430, top: 47, width: 360, height: 590 };
    const shortArea = { ...AREA, height: 640 };
    expect(
      placeBelowObstacles({ rect: CARD, obstacles: [tall], area: shortArea }),
    ).toEqual(CARD);
  });
});

describe("collectObstacles", () => {
  it("turns the full-screen notification layer into a banner in the corner", () => {
    const obstacles = collectObstacles(
      [
        {
          left: 0,
          top: 0,
          width: 1800,
          height: 1169,
          bundleId: "com.apple.notificationcenterui",
        },
      ],
      AREA,
    );
    expect(obstacles).toEqual([
      { left: 1420, top: 39, width: 380, height: 120 },
    ]);
    expect(placeBelowObstacles({ rect: CARD, obstacles, area: AREA }).top).toBe(
      167,
    );
  });

  it("keeps other windows as they are", () => {
    expect(
      collectObstacles(
        [
          {
            left: 1430,
            top: 47,
            width: 340,
            height: 96,
            bundleId: "com.granola.app",
          },
        ],
        AREA,
      ),
    ).toEqual([{ left: 1430, top: 47, width: 340, height: 96 }]);
  });
});
