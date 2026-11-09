import { zodResolver } from "@hookform/resolvers/zod";
import {
  createForgotPasswordSchema,
  type ForgotPasswordSchema,
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
import { FORGOT_PASSWORD_VALIDATION } from "@/features/auth/messages";
import { authClient } from "@/lib/auth-client";

const labels = AUTH_LABELS.forgotPassword;

export const ForgotPasswordForm = () => {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = React.useState<string>();

  const form = useForm<ForgotPasswordSchema>({
    resolver: zodResolver(
      createForgotPasswordSchema(FORGOT_PASSWORD_VALIDATION),
    ),
    defaultValues: { email: "" },
  });

  const submit = async (values: ForgotPasswordSchema) => {
    setErrorMessage(undefined);

    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email: values.email,
        type: "forget-password",
      });
      throwIfAuthError(result);

      router.push({
        pathname: "/reset-password",
        params: { email: values.email },
      });
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    }
  };

  return (
    <View className="gap-6">
      <AuthHeader title={labels.title} description={labels.description} />

      <View className="gap-4">
        <FormMessage message={errorMessage} />

        <FormField
          control={form.control}
          name="email"
          label={labels.emailLabel}
          placeholder={labels.emailPlaceholder}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
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
