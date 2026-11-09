import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@workspace/ui/components/ui/sonner";
import { TooltipProvider } from "@workspace/ui/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { RouterProvider } from "react-router";

import { queryClient } from "@/lib/query-client.js";
import { router } from "@/router.js";

export const App = () => (
  <ThemeProvider
    attribute="class"
    defaultTheme="dark"
    disableTransitionOnChange
  >
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <RouterProvider router={router} />
        <Toaster position="bottom-right" />
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);
