"use client";

import { Switch } from "@workspace/ui/components/ui/switch";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

const CIRCLE_EXPAND_DURATION = 500;

export const ThemeSwitcher = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const switchRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-7 w-11" />;
  }

  const isDark = resolvedTheme === "dark";

  const toggleTheme = () => {
    const nextTheme = isDark ? "light" : "dark";

    if (!document.startViewTransition) {
      setTheme(nextTheme);
      return;
    }

    const rect = switchRef.current?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : 0;

    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    const transition = document.startViewTransition(() => {
      setTheme(nextTheme);
    });

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: CIRCLE_EXPAND_DURATION,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    });
  };

  return (
    <Switch
      ref={switchRef}
      checked={isDark}
      onCheckedChange={toggleTheme}
      aria-label="Toggle theme"
      className="cursor-pointer data-[size=default]:h-7 data-[size=default]:w-11 **:data-[slot=switch-thumb]:size-5"
    >
      {isDark ? (
        <Moon className="text-primary size-3" />
      ) : (
        <Sun className="text-primary size-3" />
      )}
    </Switch>
  );
};
