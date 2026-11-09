import { zodResolver } from "@hookform/resolvers/zod";
import {
  createTwoFactorSchema,
  type TwoFactorSchema,
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
import { TWO_FACTOR_VALIDATION } from "@/features/auth/messages";
import { authClient } from "@/lib/auth-client";

const labels = AUTH_LABELS.twoFactor;
const TOTP_CODE_LENGTH = 6;

export const TwoFactorForm = () => {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = React.useState<string>();

  const form = useForm<TwoFactorSchema>({
    resolver: zodResolver(createTwoFactorSchema(TWO_FACTOR_VALIDATION)),
    defaultValues: { code: "" },
  });

  const submit = async (values: TwoFactorSchema) => {
    setErrorMessage(undefined);

    try {
      const result = await authClient.twoFactor.verifyTotp({
        code: values.code,
      });
      throwIfAuthError(result);

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
          name="code"
          label={labels.codeLabel}
          placeholder={labels.codePlaceholder}
          keyboardType="number-pad"
          maxLength={TOTP_CODE_LENGTH}
          autoComplete="one-time-code"
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
