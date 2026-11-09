import { z } from "zod";

import type { VerifyEmailOtpValidation } from "../types";

const OTP_CODE_LENGTH = 6;

export const createVerifyEmailOtpSchema = (
  messages: VerifyEmailOtpValidation,
) =>
  z.object({
    code: z.string().length(OTP_CODE_LENGTH, { error: messages.codeLength }),
  });

export type VerifyEmailOtpSchema = z.infer<
  ReturnType<typeof createVerifyEmailOtpSchema>
>;
