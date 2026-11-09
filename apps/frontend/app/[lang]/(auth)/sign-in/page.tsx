import { SignInForm } from "@workspace/auth/components/sign-in-form";

import { getNamespace } from "@/app/[lang]/dictionaries";
import { getValidLocale } from "@/app/[lang]/layout";

interface PageProps {
  params: Promise<{ lang: string }>;
}

const Page = async ({ params }: PageProps) => {
  const lang = getValidLocale((await params).lang);
  const dict = await getNamespace("auth", lang);

  return (
    <SignInForm
      labels={dict.signIn}
      forgotPasswordHref="/forgot-password"
      signUpHref="/sign-up"
      successRedirect="/dashboard"
      twoFactorRedirect="/two-factor"
    />
  );
};

export default Page;
