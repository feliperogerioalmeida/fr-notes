"use client";

import { authClient } from "@workspace/auth/client";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { ThemeSwitcher } from "@/components/theme-switcher";

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

const ProtectedLayout = ({ children }: ProtectedLayoutProps) => {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  if (isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="text-muted-foreground size-8 animate-spin" />
      </div>
    );
  }

  if (!session) {
    router.replace("/sign-in");
    return null;
  }

  return (
    <>
      <header className="fixed top-0 right-0 z-50 p-4">
        <ThemeSwitcher />
      </header>
      <main className="pt-16 md:pt-20 lg:pt-24">{children}</main>
    </>
  );
};

export default ProtectedLayout;
