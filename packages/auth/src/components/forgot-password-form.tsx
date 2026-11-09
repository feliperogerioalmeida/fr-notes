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
import { Input } from "@workspace/ui/components/ui/input";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { authClient } from "../client";
import {
  createForgotPasswordSchema,
  type ForgotPasswordSchema,
} from "../schemas/forgot-password";
import type { ForgotPasswordFormProps } from "../types";

export const ForgotPasswordForm = ({
  labels,
  signInHref,
  onSuccess,
  onError,
}: ForgotPasswordFormProps) => {
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<ForgotPasswordSchema>({
    resolver: zodResolver(createForgotPasswordSchema(labels.validation)),
    defaultValues: {
      email: "",
    },
  });

  const handleSubmit = async (values: ForgotPasswordSchema) => {
    const { error } = await authClient.requestPasswordReset({
      email: values.email,
      redirectTo: "/reset-password",
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

    setSubmitted(true);
    onSuccess?.();
  };

  if (submitted) {
    return (
      <div className="flex w-full flex-col sm:max-w-sm">
        <Card className="relative gap-4 overflow-hidden pt-0 shadow-md">
          <div className="gradient-auth-accent h-1" />

          <CardHeader className="text-center">
            <div className="bg-primary/10 mx-auto mb-2 flex size-12 items-center justify-center rounded-full">
              <Mail className="text-primary size-6" />
            </div>
            <CardTitle className="text-xl tracking-tight">
              {labels.successTitle}
            </CardTitle>
            <CardDescription>{labels.successDescription}</CardDescription>
          </CardHeader>

          <CardContent className="text-center">
            <Link
              href={signInHref}
              className="text-muted-foreground hover:text-primary inline-flex items-center gap-1 text-sm transition-colors"
            >
              <ArrowLeft className="size-3" />
              {labels.backToSignInLink}
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{labels.emailLabel}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={labels.emailPlaceholder}
                          autoComplete="email"
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
