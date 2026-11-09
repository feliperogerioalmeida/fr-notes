import { z } from "zod";

import type { SignUpValidation } from "../types";

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

export const createSignUpSchema = (messages: SignUpValidation) =>
  z
    .object({
      name: z.string().min(1, { error: messages.nameRequired }),
      email: z.email({ error: messages.invalidEmail }),
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

export type SignUpSchema = z.infer<ReturnType<typeof createSignUpSchema>>;
