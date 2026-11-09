import { expo } from "@better-auth/expo";
import { APP_NAME, APP_SCHEME } from "@workspace/utils";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  bearer,
  emailOTP,
  haveIBeenPwned,
  openAPI,
  twoFactor,
} from "better-auth/plugins";

import {
  AUTH_URL,
  BASE_URL,
  COOKIE_DOMAIN,
  CORS_ORIGIN,
} from "@/config/env.js";
import { db } from "@/db/index.js";
import { findUserByEmail } from "@/repositories/user.js";
import { renderEmail } from "@/utils/render-email.js";
import { sendEmail } from "@/utils/send-email.js";

const RESET_PASSWORD_EXPIRES_MINUTES = 60;
const VERIFY_EMAIL_OTP_LENGTH = 6;
const VERIFY_EMAIL_OTP_EXPIRES_SECONDS = 10 * 60;
const VERIFY_EMAIL_OTP_EXPIRES_MINUTES = 10;

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, token }) => {
      const resetUrl = `${AUTH_URL}/reset-password?token=${token}`;
      const html = await renderEmail("reset-password", {
        appName: APP_NAME,
        name: user.name,
        resetUrl,
        expiresInMinutes: RESET_PASSWORD_EXPIRES_MINUTES,
        year: new Date().getFullYear(),
      });
      await sendEmail({
        to: user.email,
        subject: `Redefina sua senha — ${APP_NAME}`,
        text: `Acesse o link para redefinir sua senha: ${resetUrl}`,
        html,
      });
    },
    revokeSessionsOnPasswordReset: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  emailVerification: {
    autoSignInAfterVerification: true,
  },
  rateLimit: {
    enabled: true,
    window: 10,
    max: 100,
  },
  trustedOrigins: [...CORS_ORIGIN.split(","), `${APP_SCHEME}://`],
  advanced: {
    ...(COOKIE_DOMAIN && {
      crossSubDomainCookies: {
        enabled: true,
        domain: COOKIE_DOMAIN,
      },
    }),
    useSecureCookies: BASE_URL.startsWith("https"),
  },
  appName: APP_NAME,
  plugins: [
    openAPI(),
    bearer(),
    expo(),
    twoFactor({
      issuer: APP_NAME,
      backupCodeOptions: {
        storeBackupCodes: "encrypted",
      },
    }),
    haveIBeenPwned({
      customPasswordCompromisedMessage:
        "Esta senha apareceu em vazamentos de dados conhecidos e não é mais segura. Escolha uma senha diferente que você não tenha usado em nenhum outro site.",
    }),
    emailOTP({
      otpLength: VERIFY_EMAIL_OTP_LENGTH,
      expiresIn: VERIFY_EMAIL_OTP_EXPIRES_SECONDS,
      sendVerificationOnSignUp: true,
      async sendVerificationOTP({ email, otp, type }) {
        const existingUser = await findUserByEmail(email);
        const html = await renderEmail("verify-email-otp", {
          appName: APP_NAME,
          name: existingUser?.name ?? "",
          otp,
          expiresInMinutes: VERIFY_EMAIL_OTP_EXPIRES_MINUTES,
          year: new Date().getFullYear(),
        });
        const subject =
          type === "forget-password"
            ? `Código para redefinir sua senha — ${APP_NAME}`
            : `Seu código de verificação — ${APP_NAME}`;
        await sendEmail({
          to: email,
          subject,
          text: `Seu código é ${otp}. Ele expira em ${VERIFY_EMAIL_OTP_EXPIRES_MINUTES} minutos.`,
          html,
        });
      },
    }),
  ],
});
