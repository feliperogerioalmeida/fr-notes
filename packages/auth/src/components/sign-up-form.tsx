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
import { Loader2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { authClient } from "../client";
import { createSignUpSchema, type SignUpSchema } from "../schemas/sign-up";
import type { SignUpFormProps } from "../types";

export const SignUpForm = ({
  labels,
  signInHref,
  successRedirect,
  onSuccess,
  onError,
}: SignUpFormProps) => {
  const router = useRouter();

  const form = useForm<SignUpSchema>({
    resolver: zodResolver(createSignUpSchema(labels.validation)),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleSubmit = async (values: SignUpSchema) => {
    const { error } = await authClient.signUp.email({
      name: values.name,
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

    if (onSuccess) {
      onSuccess(values.email);
    } else if (successRedirect) {
      const separator = successRedirect.includes("?") ? "&" : "?";
      router.push(
        `${successRedirect}${separator}email=${encodeURIComponent(values.email)}`,
      );
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
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{labels.nameLabel}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={labels.namePlaceholder}
                          autoComplete="name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                      <UserPlus className="size-4" />
                      {labels.submitButton}
                    </>
                  )}
                </Button>
              </form>
            </Form>
            <div className="flex w-full justify-center">
              <p className="text-muted-foreground mt-4 text-center text-sm">
                {labels.signInText}{" "}
                <Link
                  href={signInHref}
                  className="text-primary font-semibold hover:underline"
                >
                  {labels.signInLink}
                </Link>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
