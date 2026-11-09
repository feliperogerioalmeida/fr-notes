import { Redirect, useLocalSearchParams } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export default function ResetPasswordScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();

  if (!email) return <Redirect href="/forgot-password" />;

  return (
    <ScreenContainer>
      <ResetPasswordForm email={email} />
    </ScreenContainer>
  );
}
