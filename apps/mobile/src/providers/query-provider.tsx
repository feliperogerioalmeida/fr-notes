import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";

const STALE_TIME_MS = 30_000;
const RETRY_COUNT = 1;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME_MS,
      retry: RETRY_COUNT,
    },
  },
});

export const QueryProvider = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);
