import { TwoFactorForm } from "@workspace/auth/components/two-factor-form";

import { getNamespace } from "@/app/[lang]/dictionaries";
import { getValidLocale } from "@/app/[lang]/layout";

interface PageProps {
  params: Promise<{ lang: string }>;
}

const Page = async ({ params }: PageProps) => {
  const lang = getValidLocale((await params).lang);
  const dict = await getNamespace("auth", lang);

  return (
    <TwoFactorForm
      labels={dict.twoFactor}
      signInHref="/sign-in"
      successRedirect="/"
    />
  );
};

export default Page;
