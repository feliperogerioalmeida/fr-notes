import { z } from "zod";

import type { ForgotPasswordValidation } from "../types";

export const createForgotPasswordSchema = (
  messages: ForgotPasswordValidation,
) =>
  z.object({
    email: z.email({ error: messages.invalidEmail }),
  });

export type ForgotPasswordSchema = z.infer<
  ReturnType<typeof createForgotPasswordSchema>
>;
