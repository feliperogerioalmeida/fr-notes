import { isLikelyEcho, type TimedText } from "@workspace/core";

const RETENTION_MS = 60_000;

interface PersistedMicrophone extends TimedText {
  segmentId: string;
}

const recentSystem: TimedText[] = [];
const recentMicrophone: PersistedMicrophone[] = [];

const prune = <Item extends TimedText>(items: Item[], nowMs: number) => {
  const keep = items.filter((item) => nowMs - item.endMs <= RETENTION_MS);
  items.splice(0, items.length, ...keep);
};

export const isMicrophoneEcho = (segment: TimedText): boolean => {
  prune(recentSystem, segment.endMs);
  return isLikelyEcho({ microphone: segment, system: recentSystem });
};

export const rememberMicrophone = (segment: PersistedMicrophone) => {
  prune(recentMicrophone, segment.endMs);
  recentMicrophone.push(segment);
};

export const collectEchoesOf = (segment: TimedText): string[] => {
  recentSystem.push(segment);
  prune(recentSystem, segment.endMs);
  const echoes = recentMicrophone.filter((microphone) =>
    isLikelyEcho({ microphone, system: [segment] }),
  );
  echoes.forEach((echo) =>
    recentMicrophone.splice(recentMicrophone.indexOf(echo), 1),
  );
  return echoes.map((echo) => echo.segmentId);
};

export const resetEchoFilter = () => {
  recentSystem.length = 0;
  recentMicrophone.length = 0;
};
