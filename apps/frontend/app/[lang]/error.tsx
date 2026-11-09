"use client";

import { Button } from "@workspace/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/ui/card";
import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";

import commonDict from "./dictionaries/pt-BR/common.json";

const { error: labels } = commonDict;

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const ErrorPage = ({ error, reset }: ErrorPageProps) => {
  console.error(error);

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <div className="flex w-full flex-col sm:max-w-sm">
        <Card className="relative gap-4 overflow-hidden pt-0 shadow-md">
          <div className="gradient-auth-accent h-2" />

          <CardHeader className="text-center">
            <div className="bg-destructive/10 mx-auto mb-2 flex size-12 items-center justify-center rounded-full">
              <AlertTriangle className="text-destructive size-6" />
            </div>
            <CardTitle className="text-xl tracking-tight">
              {labels.title}
            </CardTitle>
            <CardDescription>{labels.description}</CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-3">
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={reset}
            >
              <RotateCcw className="size-4" />
              {labels.retryButton}
            </Button>
            <Button asChild size="lg" className="w-full">
              <a href="/">
                <ArrowLeft className="size-4" />
                {labels.backButton}
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default ErrorPage;
