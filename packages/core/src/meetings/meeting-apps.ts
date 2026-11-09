export interface MicrophoneApp {
  bundleId: string;
  name: string;
  pid: number;
}

export interface MeetingApp {
  bundleId: string;
  name: string;
}

const KNOWN_MEETING_APPS: Record<string, string> = {
  "us.zoom.xos": "Zoom",
  "com.microsoft.teams2": "Microsoft Teams",
  "com.microsoft.teams": "Microsoft Teams",
  "com.apple.FaceTime": "FaceTime",
  "com.tinyspeck.slackmacgap": "Slack",
  "com.hnc.Discord": "Discord",
  "com.cisco.webexmeetingsapp": "Webex",
  "Cisco-Systems.Spark": "Webex",
  "com.google.Chrome": "Google Chrome",
  "company.thebrowser.Browser": "Arc",
  "com.brave.Browser": "Brave",
  "com.microsoft.edgemac": "Microsoft Edge",
  "org.mozilla.firefox": "Firefox",
  "com.apple.Safari": "Safari",
  "com.whatsapp.WhatsApp": "WhatsApp",
  "net.whatsapp.WhatsApp": "WhatsApp",
};

const HELPER_SUFFIX = /\.helper(\..+)?$/i;
const SAFARI_WEBKIT_PREFIX = "com.apple.WebKit";

export const normalizeBundleId = (bundleId: string): string => {
  if (bundleId.startsWith(SAFARI_WEBKIT_PREFIX)) return "com.apple.Safari";
  return bundleId.replace(HELPER_SUFFIX, "");
};

export const detectMeetingApps = (apps: MicrophoneApp[]): MeetingApp[] => {
  const found = new Map<string, MeetingApp>();
  apps.forEach((app) => {
    const bundleId = normalizeBundleId(app.bundleId);
    const name = KNOWN_MEETING_APPS[bundleId];
    if (name) found.set(bundleId, { bundleId, name });
  });
  return [...found.values()];
};

export const describeMeetingApps = (apps: MeetingApp[]): string =>
  apps.map((app) => app.name).join(", ");
