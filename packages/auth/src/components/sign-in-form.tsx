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
import { PasswordInput } from "@workspace/ui/components/ui/password-input";
import { ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { authClient } from "../client";
import { createSignInSchema, type SignInSchema } from "../schemas/sign-in";
import type { SignInFormProps } from "../types";

export const SignInForm = ({
  labels,
  forgotPasswordHref,
  signUpHref,
  successRedirect,
  twoFactorRedirect,
  onSuccess,
  onError,
}: SignInFormProps) => {
  const router = useRouter();

  const form = useForm<SignInSchema>({
    resolver: zodResolver(createSignInSchema(labels.validation)),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleSubmit = async (values: SignInSchema) => {
    const { data, error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
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

    const hasTwoFactor = data && "twoFactorRedirect" in data;
    if (hasTwoFactor && twoFactorRedirect) {
      router.push(twoFactorRedirect);
      return;
    }

    if (onSuccess) {
      onSuccess();
    } else if (successRedirect) {
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
          <div className="flex flex-col gap-4">
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
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{labels.passwordLabel}</FormLabel>
                      <FormControl>
                        <PasswordInput
                          placeholder={labels.passwordPlaceholder}
                          autoComplete="current-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Link
                  href={forgotPasswordHref}
                  className="text-muted-foreground hover:text-primary -mt-2 ml-auto text-xs transition-colors"
                >
                  {labels.forgotPasswordLink}
                </Link>
                <Button
                  type="submit"
                  size="lg"
                  className="group w-full font-semibold active:scale-[0.98]"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" />
                      {labels.submittingButton}
                    </>
                  ) : (
                    <>
                      {labels.submitButton}
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </Button>
              </form>
            </Form>
            <div className="flex w-full justify-center">
              <p className="text-muted-foreground mt-6 text-center text-sm">
                {labels.signUpText}{" "}
                <Link
                  href={signUpHref}
                  className="text-primary font-semibold hover:underline"
                >
                  {labels.signUpLink}
                </Link>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
