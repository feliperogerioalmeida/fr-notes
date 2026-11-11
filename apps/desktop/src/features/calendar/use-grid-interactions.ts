import {
  addDays,
  atMinute,
  type CalendarEvent,
  MINUTES_PER_DAY,
  snapMinutes,
} from "@workspace/core";
import { type PointerEvent, type RefObject, useState } from "react";

export const HOUR_HEIGHT = 48;
export const GUTTER_WIDTH = 56;
const MINUTES_PER_HOUR = 60;
const MS_PER_MINUTE = 60_000;
const SLOT_MINUTES = 15;
const MIN_DURATION_MINUTES = 15;
const DEFAULT_DURATION_MINUTES = 30;
const DRAG_THRESHOLD_PX = 4;

interface Slot {
  dayIndex: number;
  minute: number;
}

export interface TimeRange {
  startMs: number;
  endMs: number;
}

type EventGestureKind = "move" | "resize";

type Gesture =
  | { kind: "create"; origin: Slot; current: Slot }
  | {
      kind: EventGestureKind;
      event: CalendarEvent;
      origin: Slot;
      anchor: DOMRect;
      startX: number;
      startY: number;
      range: TimeRange;
      moved: boolean;
    };

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const pointToSlot = (
  grid: HTMLElement,
  dayCount: number,
  x: number,
  y: number,
): Slot => {
  const rect = grid.getBoundingClientRect();
  const columnWidth = (rect.width - GUTTER_WIDTH) / dayCount;
  return {
    dayIndex: clamp(
      Math.floor((x - rect.left - GUTTER_WIDTH) / columnWidth),
      0,
      dayCount - 1,
    ),
    minute: clamp(
      ((y - rect.top) / HOUR_HEIGHT) * MINUTES_PER_HOUR,
      0,
      MINUTES_PER_DAY,
    ),
  };
};

const floorToSlot = (minute: number) =>
  Math.floor(minute / SLOT_MINUTES) * SLOT_MINUTES;
const ceilToSlot = (minute: number) =>
  Math.ceil(minute / SLOT_MINUTES) * SLOT_MINUTES;

export const draftFromCreate = (origin: Slot, current: Slot) => {
  const startMinute = floorToSlot(Math.min(origin.minute, current.minute));
  const endMinute = ceilToSlot(Math.max(origin.minute, current.minute));
  return {
    dayIndex: origin.dayIndex,
    startMinute,
    endMinute:
      endMinute - startMinute < MIN_DURATION_MINUTES
        ? startMinute + DEFAULT_DURATION_MINUTES
        : endMinute,
  };
};

const shiftRange = (
  gesture: Extract<Gesture, { event: CalendarEvent }>,
  slot: Slot,
): TimeRange => {
  const deltaMs =
    snapMinutes(slot.minute - gesture.origin.minute) * MS_PER_MINUTE;
  const { startMs, endMs } = {
    startMs: gesture.event.startMs,
    endMs: gesture.event.endMs,
  };
  if (gesture.kind === "resize") {
    return {
      startMs,
      endMs: Math.max(
        startMs + MIN_DURATION_MINUTES * MS_PER_MINUTE,
        endMs + deltaMs,
      ),
    };
  }
  const deltaDays = slot.dayIndex - gesture.origin.dayIndex;
  return {
    startMs: addDays(startMs, deltaDays) + deltaMs,
    endMs: addDays(endMs, deltaDays) + deltaMs,
  };
};

interface UseGridInteractionsInput {
  gridRef: RefObject<HTMLDivElement | null>;
  days: number[];
  onCreate: (range: TimeRange) => void;
  onMove: (event: CalendarEvent, range: TimeRange) => void;
  onOpen: (event: CalendarEvent, anchor: DOMRect) => void;
}

interface GestureContext extends UseGridInteractionsInput {
  gesture: Gesture | null;
  setGesture: (gesture: Gesture | null) => void;
}

type GridPointer = PointerEvent<HTMLDivElement>;

const slotAt = (context: GestureContext, x: number, y: number) =>
  context.gridRef.current
    ? pointToSlot(context.gridRef.current, context.days.length, x, y)
    : null;

const startCreate = (context: GestureContext, pointer: GridPointer) => {
  const slot = slotAt(context, pointer.clientX, pointer.clientY);
  const rect = context.gridRef.current?.getBoundingClientRect();
  const inGutter = rect ? pointer.clientX - rect.left < GUTTER_WIDTH : true;
  if (pointer.button !== 0 || !slot || inGutter) return;
  context.gridRef.current?.setPointerCapture(pointer.pointerId);
  context.setGesture({ kind: "create", origin: slot, current: slot });
};

const startEventGesture = (
  context: GestureContext,
  pointer: PointerEvent<HTMLElement>,
  event: CalendarEvent,
  kind: EventGestureKind,
) => {
  pointer.stopPropagation();
  const slot = slotAt(context, pointer.clientX, pointer.clientY);
  if (pointer.button !== 0 || !slot) return;
  context.gridRef.current?.setPointerCapture(pointer.pointerId);
  context.setGesture({
    kind,
    event,
    origin: slot,
    anchor: pointer.currentTarget.getBoundingClientRect(),
    startX: pointer.clientX,
    startY: pointer.clientY,
    range: { startMs: event.startMs, endMs: event.endMs },
    moved: false,
  });
};

const trackGesture = (context: GestureContext, pointer: GridPointer) => {
  const { gesture } = context;
  const slot = slotAt(context, pointer.clientX, pointer.clientY);
  if (!gesture || !slot) return;
  if (gesture.kind === "create") {
    context.setGesture({ ...gesture, current: slot });
    return;
  }
  const distance = Math.hypot(
    pointer.clientX - gesture.startX,
    pointer.clientY - gesture.startY,
  );
  const moved = gesture.moved || distance > DRAG_THRESHOLD_PX;
  const range =
    gesture.event.canEdit && moved ? shiftRange(gesture, slot) : gesture.range;
  context.setGesture({ ...gesture, moved, range });
};

const finishGesture = (context: GestureContext, pointer: GridPointer) => {
  const { gesture, days } = context;
  context.gridRef.current?.releasePointerCapture(pointer.pointerId);
  context.setGesture(null);
  if (!gesture) return;
  if (gesture.kind === "create") {
    const draft = draftFromCreate(gesture.origin, gesture.current);
    const day = days[draft.dayIndex] ?? days[0] ?? 0;
    context.onCreate({
      startMs: atMinute(day, draft.startMinute),
      endMs: atMinute(day, draft.endMinute),
    });
    return;
  }
  if (!gesture.moved) return context.onOpen(gesture.event, gesture.anchor);
  if (gesture.event.canEdit) context.onMove(gesture.event, gesture.range);
};

export const useGridInteractions = (input: UseGridInteractionsInput) => {
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const context: GestureContext = { ...input, gesture, setGesture };
  const createDraft =
    gesture?.kind === "create"
      ? draftFromCreate(gesture.origin, gesture.current)
      : null;
  const override =
    gesture && gesture.kind !== "create" && gesture.moved
      ? { id: gesture.event.id, ...gesture.range }
      : null;
  return {
    createDraft,
    override,
    beginEventGesture: (
      pointer: PointerEvent<HTMLElement>,
      event: CalendarEvent,
      kind: EventGestureKind,
    ) => startEventGesture(context, pointer, event, kind),
    gridHandlers: {
      onPointerDown: (pointer: GridPointer) => startCreate(context, pointer),
      onPointerMove: (pointer: GridPointer) => trackGesture(context, pointer),
      onPointerUp: (pointer: GridPointer) => finishGesture(context, pointer),
      onPointerCancel: () => setGesture(null),
    },
  };
};
