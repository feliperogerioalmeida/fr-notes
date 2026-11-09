import { SignUpForm } from "@workspace/auth/components/sign-up-form";

import { getNamespace } from "@/app/[lang]/dictionaries";
import { getValidLocale } from "@/app/[lang]/layout";

interface PageProps {
  params: Promise<{ lang: string }>;
}

const Page = async ({ params }: PageProps) => {
  const lang = getValidLocale((await params).lang);
  const dict = await getNamespace("auth", lang);

  return (
    <SignUpForm
      labels={dict.signUp}
      signInHref="/sign-in"
      successRedirect="/verify-email-otp"
    />
  );
};

export default Page;
