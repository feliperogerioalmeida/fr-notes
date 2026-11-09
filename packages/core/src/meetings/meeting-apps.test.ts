import { describe, expect, it } from "vitest";

import { detectMeetingApps, normalizeBundleId } from "./meeting-apps.js";

describe("normalizeBundleId", () => {
  it("maps helper processes to their parent app", () => {
    expect(normalizeBundleId("com.google.Chrome.helper")).toBe(
      "com.google.Chrome",
    );
    expect(normalizeBundleId("com.google.Chrome.helper.Renderer")).toBe(
      "com.google.Chrome",
    );
    expect(normalizeBundleId("com.apple.WebKit.GPU")).toBe("com.apple.Safari");
  });
});

describe("detectMeetingApps", () => {
  it("keeps only known meeting apps, once each", () => {
    const apps = detectMeetingApps([
      { bundleId: "us.zoom.xos", name: "zoom.us", pid: 1 },
      { bundleId: "com.google.Chrome.helper", name: "Chrome Helper", pid: 2 },
      {
        bundleId: "com.google.Chrome.helper.Renderer",
        name: "Chrome Helper",
        pid: 3,
      },
      { bundleId: "com.example.voice-memo", name: "Memo", pid: 4 },
    ]);

    expect(apps.map((app) => app.name)).toEqual(["Zoom", "Google Chrome"]);
  });
});
