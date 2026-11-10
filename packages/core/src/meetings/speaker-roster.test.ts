import { describe, expect, it } from "vitest";

import { type AxNode, type AxSnapshot, readRoster } from "./speaker-roster.js";

const snapshotOf = (nodes: AxNode[]): AxSnapshot => ({
  bundleId: "com.google.Chrome",
  pid: 42,
  observedAtMs: 1_000,
  truncated: false,
  nodes,
});

const MEET_LIKE_TREE: AxNode[] = [
  { role: "AXWindow", title: "Meet - Kickoff" },
  { parent: 0, role: "AXGroup" },
  { parent: 1, role: "AXGroup", classes: ["tile"] },
  { parent: 2, role: "AXStaticText", value: "Marina Souza" },
  { parent: 2, role: "AXGroup", classes: ["indicator", "is-speaking"] },
  { parent: 1, role: "AXGroup", classes: ["tile"] },
  { parent: 5, role: "AXStaticText", value: "Joao lima" },
  { parent: 5, role: "AXGroup", classes: ["indicator"] },
  { parent: 1, role: "AXGroup", classes: ["tile"] },
  { parent: 8, role: "AXStaticText", value: "Felipe Rogério" },
  { parent: 8, role: "AXStaticText", value: "You are speaking" },
];

const KNOWN = ["Marina Souza", "João Lima", "Felipe Rogério"];

describe("readRoster", () => {
  it("finds participants and marks only the speaking tile as active", () => {
    const reading = readRoster({
      snapshot: snapshotOf(MEET_LIKE_TREE),
      knownNames: KNOWN,
      selfNames: ["Felipe Rogério"],
    });
    expect(reading.blindReason).toBeNull();
    expect(reading.participants).toEqual([
      { name: "Marina Souza", active: true },
      { name: "João Lima", active: false },
    ]);
    expect(reading.activeNames).toEqual(["Marina Souza"]);
  });

  it("reads speaking state from accessible descriptions", () => {
    const reading = readRoster({
      snapshot: snapshotOf([
        { role: "AXWindow", title: "Microsoft Teams" },
        { parent: 0, role: "AXGroup", description: "João Lima, is speaking" },
        { parent: 0, role: "AXGroup", description: "Marina Souza, muted" },
      ]),
      knownNames: KNOWN,
    });
    expect(reading.activeNames).toEqual(["João Lima"]);
  });

  it("matches a unique first name", () => {
    const reading = readRoster({
      snapshot: snapshotOf([
        { role: "AXWindow" },
        { parent: 0, role: "AXStaticText", value: "Marina" },
      ]),
      knownNames: KNOWN,
    });
    expect(reading.participants).toEqual([
      { name: "Marina Souza", active: false },
    ]);
  });

  it("does not spread an indicator across a container holding several people", () => {
    const reading = readRoster({
      snapshot: snapshotOf([
        { role: "AXWindow" },
        { parent: 0, role: "AXGroup", classes: ["speaking"] },
        { parent: 1, role: "AXStaticText", value: "Marina Souza" },
        { parent: 1, role: "AXStaticText", value: "João Lima" },
      ]),
      knownNames: KNOWN,
    });
    expect(reading.activeNames).toEqual([]);
  });

  it("explains why it cannot see anyone", () => {
    const empty = readRoster({ snapshot: snapshotOf([]), knownNames: KNOWN });
    const nobodyKnown = readRoster({
      snapshot: snapshotOf(MEET_LIKE_TREE),
      knownNames: ["Felipe Rogério"],
      selfNames: ["Felipe Rogério"],
    });
    const nobodyVisible = readRoster({
      snapshot: snapshotOf([{ role: "AXWindow", title: "Slack" }]),
      knownNames: KNOWN,
    });
    expect(empty.blindReason).toBe("no-tree");
    expect(nobodyKnown.blindReason).toBe("no-known-names");
    expect(nobodyVisible.blindReason).toBe("no-participants-visible");
  });
});
