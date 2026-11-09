import { VerifyEmailOtpForm } from "@workspace/auth/components/verify-email-otp-form";
import Link from "next/link";

import { getNamespace } from "@/app/[lang]/dictionaries";
import { getValidLocale } from "@/app/[lang]/layout";

interface PageProps {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ email?: string }>;
}

const Page = async ({ params, searchParams }: PageProps) => {
  const lang = getValidLocale((await params).lang);
  const dict = await getNamespace("auth", lang);
  const { email } = await searchParams;

  if (!email) {
    return (
      <Link href="/sign-in" className="text-muted-foreground text-sm underline">
        {dict.verifyEmailOtp.backToSignInLink}
      </Link>
    );
  }

  return (
    <VerifyEmailOtpForm
      labels={dict.verifyEmailOtp}
      email={email}
      signInHref="/sign-in"
      successRedirect="/dashboard"
    />
  );
};

export default Page;
