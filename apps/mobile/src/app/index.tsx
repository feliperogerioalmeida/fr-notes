import { Redirect } from "expo-router";

import { FullScreenLoader } from "@/components/full-screen-loader";
import { authClient } from "@/lib/auth-client";

export default function IndexScreen() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return <FullScreenLoader />;

  return <Redirect href={session ? "/dashboard" : "/sign-in"} />;
}
