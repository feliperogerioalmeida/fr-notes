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
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { authClient } from "../client";
import {
  createVerifyEmailOtpSchema,
  type VerifyEmailOtpSchema,
} from "../schemas/verify-email-otp";
import type { VerifyEmailOtpFormProps } from "../types";

const OTP_CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;
const TICK_INTERVAL_MS = 1000;

export const VerifyEmailOtpForm = ({
  labels,
  email,
  signInHref,
  successRedirect,
  onSuccess,
  onError,
}: VerifyEmailOtpFormProps) => {
  const router = useRouter();
  const [verified, setVerified] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [resending, setResending] = useState(false);

  const form = useForm<VerifyEmailOtpSchema>({
    resolver: zodResolver(createVerifyEmailOtpSchema(labels.validation)),
    defaultValues: {
      code: "",
    },
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => {
      setCooldown((previous) => (previous > 0 ? previous - 1 : 0));
    }, TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [cooldown]);

  const handleSubmit = async (values: VerifyEmailOtpSchema) => {
    const { error } = await authClient.emailOtp.verifyEmail({
      email,
      otp: values.code,
    });

    if (error) {
      const message = error.message ?? error.statusText;
      if (onError) {
        onError(message);
      } else {
        toast.error(message);
      }
      form.setValue("code", "");
      return;
    }

    setVerified(true);
    if (onSuccess) {
      onSuccess();
    } else if (successRedirect) {
      router.push(successRedirect);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "email-verification",
    });
    setResending(false);

    if (error) {
      toast.error(error.message ?? error.statusText);
      return;
    }
    toast.success(labels.resentToast);
    setCooldown(RESEND_COOLDOWN_SECONDS);
  };

  return (
    <div className="flex w-full flex-col sm:max-w-sm">
      <Card className="relative gap-4 overflow-hidden pt-0 shadow-md">
        <div className="gradient-auth-accent h-1" />

        <CardHeader className="text-center">
          <div className="bg-primary/10 mx-auto mb-2 flex size-12 items-center justify-center rounded-full">
            {verified ? (
              <CheckCircle2 className="text-primary size-6" />
            ) : (
              <Mail className="text-primary size-6" />
            )}
          </div>
          <CardTitle className="text-xl tracking-tight">
            {verified ? labels.successTitle : labels.title}
          </CardTitle>
          <CardDescription>
            {verified ? labels.successDescription : labels.description}
          </CardDescription>
        </CardHeader>

        {!verified && (
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
                            maxLength={OTP_CODE_LENGTH}
                            value={field.value}
                            onChange={field.onChange}
                            autoComplete="one-time-code"
                            inputMode="numeric"
                            pattern="\d*"
                            data-1p-ignore
                            data-lpignore="true"
                            data-bwignore
                            containerClassName="gap-2"
                          >
                            <InputOTPGroup className="gap-2">
                              {Array.from({ length: OTP_CODE_LENGTH }).map(
                                (_, index) => (
                                  <InputOTPSlot
                                    key={index}
                                    index={index}
                                    className="size-12 rounded-md border-l text-lg font-semibold first:rounded-l-md last:rounded-r-md"
                                  />
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
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={handleResend}
                disabled={cooldown > 0 || resending}
                className="text-muted-foreground hover:text-primary disabled:hover:text-muted-foreground h-auto cursor-pointer p-0 text-sm no-underline disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resending ? <Loader2 className="size-3 animate-spin" /> : null}
                {cooldown > 0
                  ? labels.resendCooldown.replace("{seconds}", String(cooldown))
                  : labels.resendButton}
              </Button>
              <div className="flex w-full justify-center">
                <p className="text-center">
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
        )}
      </Card>
    </div>
  );
};
