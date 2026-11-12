import { describe, expect, it } from "vitest";

import {
  bindMeetingApps,
  hasMeetingEnded,
  isBoundMeetingActive,
} from "./meeting-end.js";

const chrome = { bundleId: "com.google.Chrome", name: "Google Chrome" };
const zoom = { bundleId: "us.zoom.xos", name: "Zoom" };

describe("meeting end", () => {
  it("binds every meeting app seen during the recording once", () => {
    expect(bindMeetingApps([], [chrome])).toEqual([chrome.bundleId]);
    expect(bindMeetingApps([chrome.bundleId], [chrome, zoom])).toEqual([
      chrome.bundleId,
      zoom.bundleId,
    ]);
  });

  it("only ends a meeting that was bound to an app", () => {
    expect(hasMeetingEnded([], [])).toBe(false);
    expect(hasMeetingEnded([chrome.bundleId], [])).toBe(true);
    expect(hasMeetingEnded([chrome.bundleId], [chrome])).toBe(false);
  });

  it("ignores meeting apps that were never part of the recording", () => {
    expect(isBoundMeetingActive([chrome.bundleId], [zoom])).toBe(false);
    expect(hasMeetingEnded([chrome.bundleId], [zoom])).toBe(true);
  });
});
