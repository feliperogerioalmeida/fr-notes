import { defaultLocale, type Locale, locales } from "@/lib/i18n.config";

export const getValidLocale = (lang: string): Locale => {
  return locales.includes(lang as Locale) ? (lang as Locale) : defaultLocale;
};

interface LangLayoutProps {
  children: React.ReactNode;
}

const LangLayout = ({ children }: LangLayoutProps) => {
  return <>{children}</>;
};

export default LangLayout;
