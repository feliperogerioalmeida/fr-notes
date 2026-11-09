import { ForgotPasswordForm } from "@workspace/auth/components/forgot-password-form";

import { getNamespace } from "@/app/[lang]/dictionaries";
import { getValidLocale } from "@/app/[lang]/layout";

interface PageProps {
  params: Promise<{ lang: string }>;
}

const Page = async ({ params }: PageProps) => {
  const lang = getValidLocale((await params).lang);
  const dict = await getNamespace("auth", lang);

  return (
    <ForgotPasswordForm labels={dict.forgotPassword} signInHref="/sign-in" />
  );
};

export default Page;
