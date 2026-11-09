"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@workspace/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/ui/form";
import { PasswordInput } from "@workspace/ui/components/ui/password-input";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { authClient } from "../client";
import {
  createResetPasswordSchema,
  type ResetPasswordSchema,
} from "../schemas/reset-password";
import type { ResetPasswordFormProps } from "../types";

export const ResetPasswordForm = ({
  labels,
  token,
  signInHref,
  successRedirect,
  onSuccess,
  onError,
}: ResetPasswordFormProps) => {
  const router = useRouter();

  const form = useForm<ResetPasswordSchema>({
    resolver: zodResolver(createResetPasswordSchema(labels.validation)),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const handleSubmit = async (values: ResetPasswordSchema) => {
    const { error } = await authClient.resetPassword({
      newPassword: values.password,
      token,
    });

    if (error) {
      const message = error.message ?? error.statusText;
      if (onError) {
        onError(message);
      } else {
        toast.error(message);
      }
      return;
    }

    if (onSuccess) {
      onSuccess();
    } else if (successRedirect) {
      toast.success(labels.title);
      router.push(successRedirect);
    }
  };

  return (
    <div className="flex w-full flex-col sm:max-w-sm">
      <Card className="relative gap-4 overflow-hidden pt-0 shadow-md">
        <div className="gradient-auth-accent h-1" />

        <CardHeader className="text-center">
          <CardTitle className="text-xl tracking-tight">
            {labels.title}
          </CardTitle>
          <CardDescription>{labels.description}</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex w-full flex-col gap-4">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="grid gap-4"
                noValidate
              >
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{labels.passwordLabel}</FormLabel>
                      <FormControl>
                        <PasswordInput
                          placeholder={labels.passwordPlaceholder}
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{labels.confirmPasswordLabel}</FormLabel>
                      <FormControl>
                        <PasswordInput
                          placeholder={labels.confirmPasswordPlaceholder}
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  size="lg"
                  className="w-full font-semibold active:scale-[0.98]"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" />
                      {labels.submittingButton}
                    </>
                  ) : (
                    labels.submitButton
                  )}
                </Button>
              </form>
            </Form>
            <div className="flex w-full justify-center">
              <p className="mt-4 text-center">
                <Link
                  href={signInHref}
                  className="text-muted-foreground hover:text-primary inline-flex items-center gap-1 text-sm transition-colors"
                >
                  <ArrowLeft className="size-3" />
                  {labels.backToSignInLink}
                </Link>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
