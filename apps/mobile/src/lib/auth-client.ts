import { expoClient } from "@better-auth/expo/client";
import { APP_SCHEME } from "@workspace/utils";
import { emailOTPClient, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

import { API_URL } from "@/config/env";

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [
    expoClient({
      scheme: APP_SCHEME,
      storagePrefix: APP_SCHEME,
      storage: SecureStore,
    }),
    twoFactorClient(),
    emailOTPClient(),
  ],
});

export type SessionUser = (typeof authClient.$Infer.Session)["user"];
