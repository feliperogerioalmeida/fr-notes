import { z } from "zod";

import type { SignInValidation } from "../types";

export const createSignInSchema = (messages: SignInValidation) =>
  z.object({
    email: z.email({ error: messages.invalidEmail }),
    password: z.string().min(1, { error: messages.passwordRequired }),
  });

export type SignInSchema = z.infer<ReturnType<typeof createSignInSchema>>;
