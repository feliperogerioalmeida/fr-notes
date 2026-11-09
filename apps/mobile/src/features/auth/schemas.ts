import {
  createResetPasswordSchema,
  createVerifyEmailOtpSchema,
} from "@workspace/auth/schemas";
import type {
  ResetPasswordValidation,
  VerifyEmailOtpValidation,
} from "@workspace/auth/types";
import type { z } from "zod";

export const createResetPasswordOtpSchema = ({
  otp,
  password,
}: {
  otp: VerifyEmailOtpValidation;
  password: ResetPasswordValidation;
}) => createVerifyEmailOtpSchema(otp).and(createResetPasswordSchema(password));

export type ResetPasswordOtpSchema = z.infer<
  ReturnType<typeof createResetPasswordOtpSchema>
>;
