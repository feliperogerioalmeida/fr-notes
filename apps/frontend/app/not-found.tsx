import { Button } from "@workspace/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/ui/card";
import { ArrowLeft, FileQuestion } from "lucide-react";
import Link from "next/link";

import { ThemeSwitcher } from "@/components/theme-switcher";

import { getNamespace } from "./[lang]/dictionaries";

const NotFound = async () => {
  const { notFound } = await getNamespace("common");

  return (
    <>
      <div className="fixed top-0 right-0 z-50 p-4">
        <ThemeSwitcher />
      </div>
      <main className="flex min-h-svh items-center justify-center p-4">
        <div className="flex w-full flex-col sm:max-w-sm">
          <Card className="relative gap-4 overflow-hidden pt-0 shadow-md">
            <div className="gradient-auth-accent h-2" />

            <CardHeader className="text-center">
              <div className="bg-muted mx-auto mb-2 flex size-12 items-center justify-center rounded-full">
                <FileQuestion className="text-muted-foreground size-6" />
              </div>
              <CardTitle className="text-xl tracking-tight">
                {notFound.title}
              </CardTitle>
              <CardDescription>{notFound.description}</CardDescription>
            </CardHeader>

            <CardContent>
              <Button asChild variant="outline" size="lg" className="w-full">
                <Link href="/">
                  <ArrowLeft className="size-4" />
                  {notFound.backButton}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
};

export default NotFound;
