import { z } from "zod";

import type { TwoFactorValidation } from "../types";

const TOTP_CODE_LENGTH = 6;

export const createTwoFactorSchema = (messages: TwoFactorValidation) =>
  z.object({
    code: z.string().length(TOTP_CODE_LENGTH, { error: messages.codeLength }),
  });

export type TwoFactorSchema = z.infer<ReturnType<typeof createTwoFactorSchema>>;
