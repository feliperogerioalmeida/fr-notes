import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  RESET_PASSWORD_VALIDATION,
  VERIFY_EMAIL_OTP_VALIDATION,
} from "@/features/auth/messages";
import {
  createResetPasswordOtpSchema,
  type ResetPasswordOtpSchema,
} from "@/features/auth/schemas";
import { authClient } from "@/lib/auth-client";

const labels = AUTH_LABELS.resetPassword;
const OTP_CODE_LENGTH = 6;

export const ResetPasswordForm = ({ email }: { email: string }) => {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = React.useState<string>();

  const form = useForm<ResetPasswordOtpSchema>({
    resolver: zodResolver(
      createResetPasswordOtpSchema({
        otp: VERIFY_EMAIL_OTP_VALIDATION,
        password: RESET_PASSWORD_VALIDATION,
      }),
    ),
    defaultValues: { code: "", password: "", confirmPassword: "" },
  });

  const submit = async (values: ResetPasswordOtpSchema) => {
    setErrorMessage(undefined);

    try {
      const result = await authClient.emailOtp.resetPassword({
        email,
        otp: values.code,
        password: values.password,
      });
      throwIfAuthError(result);

      router.replace("/sign-in");
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
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

        <FormField
          control={form.control}
          name="code"
          label={labels.codeLabel}
          placeholder={labels.codePlaceholder}
          keyboardType="number-pad"
          maxLength={OTP_CODE_LENGTH}
          autoComplete="one-time-code"
        />
        <FormField
          control={form.control}
          name="password"
          label={labels.passwordLabel}
          placeholder={labels.passwordPlaceholder}
          secureTextEntry
          autoComplete="new-password"
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          label={labels.confirmPasswordLabel}
          placeholder={labels.confirmPasswordPlaceholder}
          secureTextEntry
          autoComplete="new-password"
        />

        <Button
          size="lg"
          isLoading={form.formState.isSubmitting}
          onPress={form.handleSubmit(submit)}
        >
          <Text>{labels.submitButton}</Text>
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
