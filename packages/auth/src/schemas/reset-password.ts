import { z } from "zod";

import type { ResetPasswordValidation } from "../types";

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

export const createResetPasswordSchema = (messages: ResetPasswordValidation) =>
  z
    .object({
      password: z
        .string()
        .min(MIN_PASSWORD_LENGTH, { error: messages.passwordTooShort })
        .max(MAX_PASSWORD_LENGTH, { error: messages.passwordTooLong }),
      confirmPassword: z
        .string()
        .min(1, { error: messages.confirmPasswordRequired }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      error: messages.passwordsMismatch,
      path: ["confirmPassword"],
    });

export type ResetPasswordSchema = z.infer<
  ReturnType<typeof createResetPasswordSchema>
>;
