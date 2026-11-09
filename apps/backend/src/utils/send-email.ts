import { Resend } from "resend";

import { EMAIL_FROM, ENVIRONMENT, RESEND_API_KEY } from "@/config/env.js";
import type { SendEmailParams } from "@/domain/email.js";
import { AppError } from "@/errors/index.js";

const EMAIL_FAILURE_STATUS = 500;

const resend = new Resend(RESEND_API_KEY);

export const sendEmail = async ({
  to,
  subject,
  text,
  html,
}: SendEmailParams): Promise<void> => {
  if (ENVIRONMENT.IS_TESTING) return;

  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject,
    text,
    ...(html ? { html } : {}),
  });

  if (error) {
    throw new AppError(
      `Failed to send email to ${to}: ${error.message}`,
      EMAIL_FAILURE_STATUS,
    );
  }
};
