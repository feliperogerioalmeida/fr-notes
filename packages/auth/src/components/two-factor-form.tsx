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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@workspace/ui/components/ui/input-otp";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { authClient } from "../client";
import {
  createTwoFactorSchema,
  type TwoFactorSchema,
} from "../schemas/two-factor";
import type { TwoFactorFormProps } from "../types";

const TOTP_CODE_LENGTH = 6;

export const TwoFactorForm = ({
  labels,
  signInHref,
  successRedirect,
  onSuccess,
  onError,
}: TwoFactorFormProps) => {
  const router = useRouter();

  const form = useForm<TwoFactorSchema>({
    resolver: zodResolver(createTwoFactorSchema(labels.validation)),
    defaultValues: {
      code: "",
    },
  });

  const handleSubmit = async (values: TwoFactorSchema) => {
    const { error } = await authClient.twoFactor.verifyTotp({
      code: values.code,
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
      router.push(successRedirect);
    }
  };

  return (
    <div className="flex w-full flex-col sm:max-w-sm">
      <Card className="relative gap-4 overflow-hidden pt-0 shadow-md">
        <div className="gradient-auth-accent h-1" />

        <CardHeader className="text-center">
          <div className="bg-primary/10 mx-auto mb-2 flex size-12 items-center justify-center rounded-full">
            <ShieldCheck className="text-primary size-6" />
          </div>
          <CardTitle className="flex w-full justify-center text-center text-xl tracking-tight">
            {labels.title}
          </CardTitle>
          <CardDescription className="flex justify-center">
            {labels.description}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex w-full flex-col justify-center gap-4">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="grid gap-6"
                noValidate
              >
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem className="flex flex-col items-center">
                      <FormLabel className="sr-only">
                        {labels.codeLabel}
                      </FormLabel>
                      <FormControl>
                        <InputOTP
                          maxLength={TOTP_CODE_LENGTH}
                          value={field.value}
                          onChange={field.onChange}
                        >
                          <InputOTPGroup>
                            {Array.from({ length: TOTP_CODE_LENGTH }).map(
                              (_, index) => (
                                <InputOTPSlot key={index} index={index} />
                              ),
                            )}
                          </InputOTPGroup>
                        </InputOTP>
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
