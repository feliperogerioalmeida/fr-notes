const requireEnv = ({
  key,
  value,
}: {
  key: string;
  value?: string;
}): string => {
  if (!value) {
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return value;
};

export const API_URL = requireEnv({
  key: "EXPO_PUBLIC_API_URL",
  value: process.env.EXPO_PUBLIC_API_URL,
});
