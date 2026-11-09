import { zodResolver } from "@hookform/resolvers/zod";
import { createSignUpSchema, type SignUpSchema } from "@workspace/auth/schemas";
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
import { SIGN_UP_VALIDATION } from "@/features/auth/messages";
import { authClient } from "@/lib/auth-client";

const labels = AUTH_LABELS.signUp;

export const SignUpForm = () => {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = React.useState<string>();

  const form = useForm<SignUpSchema>({
    resolver: zodResolver(createSignUpSchema(SIGN_UP_VALIDATION)),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const submit = async (values: SignUpSchema) => {
    setErrorMessage(undefined);

    try {
      const result = await authClient.signUp.email({
        name: values.name,
        email: values.email,
        password: values.password,
      });
      throwIfAuthError(result);

      router.push({
        pathname: "/verify-email-otp",
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
          name="name"
          label={labels.nameLabel}
          placeholder={labels.namePlaceholder}
          autoComplete="name"
        />
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

      <View className="flex-row justify-center gap-1">
        <Text variant="muted">{labels.signInText}</Text>
        <Link href="/sign-in" asChild>
          <Text variant="small" className="font-semibold text-primary">
            {labels.signInLink}
          </Text>
        </Link>
      </View>
    </View>
  );
};
