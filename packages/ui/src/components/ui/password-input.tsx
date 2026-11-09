"use client";

import { cn } from "@workspace/ui/lib/utils";
import { Eye, EyeOff } from "lucide-react";
import * as React from "react";

import { Button } from "./button";
import { Input } from "./input";

function PasswordInput({ className, ...props }: React.ComponentProps<"input">) {
  const [showPassword, setShowPassword] = React.useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <div className="relative">
      <Input
        type={showPassword ? "text" : "password"}
        className={cn(
          "pr-10 [&::-ms-reveal]:hidden [&::-webkit-credentials-auto-fill-button]:hidden",
          className,
        )}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
        onClick={togglePasswordVisibility}
        tabIndex={-1}
      >
        {showPassword ? (
          <EyeOff className="size-4" />
        ) : (
          <Eye className="size-4" />
        )}
      </Button>
    </div>
  );
}

export { PasswordInput };
