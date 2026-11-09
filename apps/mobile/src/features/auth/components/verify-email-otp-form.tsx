import { zodResolver } from "@hookform/resolvers/zod";
import {
  createVerifyEmailOtpSchema,
  type VerifyEmailOtpSchema,
} from "@workspace/auth/schemas";
import { Link, useRouter } from "expo-router";
import * as React from "react";
import { useForm } from "react-hook-form";
import { View } from "react-native";

import { FormField } from "@/components/form-field";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { AuthHeader } from "@/features/auth/components/auth-header";
import { readErrorMessage, throwIfAuthError } from "@/features/auth/errors";
import { AUTH_LABELS } from "@/features/auth/labels";
import { VERIFY_EMAIL_OTP_VALIDATION } from "@/features/auth/messages";
import { authClient } from "@/lib/auth-client";

const labels = AUTH_LABELS.verifyEmailOtp;
const OTP_CODE_LENGTH = 6;

export const VerifyEmailOtpForm = ({ email }: { email: string }) => {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = React.useState<string>();
  const [successMessage, setSuccessMessage] = React.useState<string>();
  const [isResending, setIsResending] = React.useState(false);

  const form = useForm<VerifyEmailOtpSchema>({
    resolver: zodResolver(
      createVerifyEmailOtpSchema(VERIFY_EMAIL_OTP_VALIDATION),
    ),
    defaultValues: { code: "" },
  });

  const submit = async (values: VerifyEmailOtpSchema) => {
    setErrorMessage(undefined);
    setSuccessMessage(undefined);

    try {
      const result = await authClient.emailOtp.verifyEmail({
        email,
        otp: values.code,
      });
      throwIfAuthError(result);

      router.replace("/dashboard");
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    }
  };

  const resendCode = async () => {
    setErrorMessage(undefined);
    setSuccessMessage(undefined);
    setIsResending(true);

    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      });
      throwIfAuthError(result);

      setSuccessMessage(labels.resendSuccess);
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <View className="gap-6">
      <AuthHeader
        title={labels.title}
        description={`${labels.description} ${email}.`}
      />

      <View className="gap-4">
        <FormMessage message={errorMessage} />
        <FormMessage message={successMessage} variant="success" />

        <FormField
          control={form.control}
          name="code"
          label={labels.codeLabel}
          placeholder={labels.codePlaceholder}
          keyboardType="number-pad"
          maxLength={OTP_CODE_LENGTH}
          autoComplete="one-time-code"
        />

        <Button
          size="lg"
          isLoading={form.formState.isSubmitting}
          onPress={form.handleSubmit(submit)}
        >
          <Text>{labels.submitButton}</Text>
        </Button>

        <Button variant="ghost" isLoading={isResending} onPress={resendCode}>
          <Text>{labels.resendButton}</Text>
        </Button>
      </View>

      <Link href="/sign-in" asChild>
        <Text variant="small" className="text-center text-muted-foreground">
          {labels.backToSignInLink}
        </Text>
      </Link>
    </View>
  );
};
