export { authClient } from "./client";
export {
  ForgotPasswordForm,
  ResetPasswordForm,
  SignInForm,
  SignUpForm,
  TwoFactorForm,
  VerifyEmailOtpForm,
} from "./components/index";
export {
  createForgotPasswordSchema,
  createResetPasswordSchema,
  createSignInSchema,
  createSignUpSchema,
  createTwoFactorSchema,
  createVerifyEmailOtpSchema,
} from "./schemas/index";
export type {
  AuthDictionary,
  ForgotPasswordFormLabels,
  ForgotPasswordFormProps,
  ForgotPasswordValidation,
  ResetPasswordFormLabels,
  ResetPasswordFormProps,
  ResetPasswordValidation,
  SignInFormLabels,
  SignInFormProps,
  SignInValidation,
  SignUpFormLabels,
  SignUpFormProps,
  SignUpValidation,
  TwoFactorFormLabels,
  TwoFactorFormProps,
  TwoFactorValidation,
  VerifyEmailOtpFormLabels,
  VerifyEmailOtpFormProps,
  VerifyEmailOtpValidation,
} from "./types";
