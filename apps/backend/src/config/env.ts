import "dotenv/config";

const fetchEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return value;
};

export const DATABASE_URL = fetchEnv("DATABASE_URL");
export const CORS_ORIGIN = fetchEnv("CORS_ORIGIN");

export const NODE_ENV = fetchEnv("NODE_ENV");
export const ENVIRONMENT = {
  IS_PRODUCTION: NODE_ENV === "production",
  IS_DEVELOPMENT: NODE_ENV === "development",
  IS_TESTING: NODE_ENV === "test",
};

export const PORT = Number(fetchEnv("PORT"));
export const BASE_URL = fetchEnv("BASE_URL");
export const HOST = fetchEnv("HOST");

export const BETTER_AUTH_SECRET = fetchEnv("BETTER_AUTH_SECRET");
export const BETTER_AUTH_URL = fetchEnv("BETTER_AUTH_URL");
export const AUTH_URL = fetchEnv("AUTH_URL");

export const RESEND_API_KEY = fetchEnv("RESEND_API_KEY");
export const EMAIL_FROM = fetchEnv("EMAIL_FROM");

export const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN ?? "";
