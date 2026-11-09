import { Redirect, useLocalSearchParams } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { VerifyEmailOtpForm } from "@/features/auth/components/verify-email-otp-form";

export default function VerifyEmailOtpScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();

  if (!email) return <Redirect href="/sign-in" />;

  return (
    <ScreenContainer>
      <VerifyEmailOtpForm email={email} />
    </ScreenContainer>
  );
}
