"use client";

import { authClient } from "@workspace/auth/client";
import { Loader2 } from "lucide-react";
import { redirect } from "next/navigation";

import { ThemeSwitcher } from "@/components/theme-switcher";

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="text-muted-foreground size-8 animate-spin" />
      </div>
    );
  }

  if (session) {
    redirect("/dashboard");
  }

  return (
    <>
      <div className="fixed top-0 right-0 z-50 p-4">
        <ThemeSwitcher />
      </div>
      <main className="flex min-h-svh items-center justify-center p-4">
        {children}
      </main>
    </>
  );
};

export default AuthLayout;
