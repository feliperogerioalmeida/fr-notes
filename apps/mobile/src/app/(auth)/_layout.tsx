import { Redirect, Stack } from "expo-router";

import { FullScreenLoader } from "@/components/full-screen-loader";
import { authClient } from "@/lib/auth-client";

export default function AuthLayout() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return <FullScreenLoader />;

  if (session) return <Redirect href="/dashboard" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
