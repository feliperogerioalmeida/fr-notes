import { zodResolver } from "@hookform/resolvers/zod";
import { createSignInSchema, type SignInSchema } from "@workspace/auth/schemas";
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
import { SIGN_IN_VALIDATION } from "@/features/auth/messages";
import { authClient } from "@/lib/auth-client";

const labels = AUTH_LABELS.signIn;

export const SignInForm = () => {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = React.useState<string>();

  const form = useForm<SignInSchema>({
    resolver: zodResolver(createSignInSchema(SIGN_IN_VALIDATION)),
    defaultValues: { email: "", password: "" },
  });

  const submit = async (values: SignInSchema) => {
    setErrorMessage(undefined);

    try {
      const result = await authClient.signIn.email(values);
      throwIfAuthError(result);

      const requiresTwoFactor =
        result.data && "twoFactorRedirect" in result.data;

      if (requiresTwoFactor) {
        router.push("/two-factor");
        return;
      }

      router.replace("/dashboard");
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
        <FormField
          control={form.control}
          name="password"
          label={labels.passwordLabel}
          placeholder={labels.passwordPlaceholder}
          secureTextEntry
          autoComplete="current-password"
        />

        <Link href="/forgot-password" asChild>
          <Text variant="small" className="ml-auto text-muted-foreground">
            {labels.forgotPasswordLink}
          </Text>
        </Link>

        <Button
          size="lg"
          isLoading={form.formState.isSubmitting}
          onPress={form.handleSubmit(submit)}
        >
          <Text>{labels.submitButton}</Text>
        </Button>
      </View>

      <View className="flex-row justify-center gap-1">
        <Text variant="muted">{labels.signUpText}</Text>
        <Link href="/sign-up" asChild>
          <Text variant="small" className="font-semibold text-primary">
            {labels.signUpLink}
          </Text>
        </Link>
      </View>
    </View>
  );
};
