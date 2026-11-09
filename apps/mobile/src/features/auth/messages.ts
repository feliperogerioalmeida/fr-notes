import type {
  ForgotPasswordValidation,
  ResetPasswordValidation,
  SignInValidation,
  SignUpValidation,
  TwoFactorValidation,
  VerifyEmailOtpValidation,
} from "@workspace/auth/types";

const INVALID_EMAIL = "Digite um e-mail válido.";
const PASSWORD_TOO_SHORT = "A senha precisa ter pelo menos 8 caracteres.";
const PASSWORD_TOO_LONG = "A senha pode ter no máximo 128 caracteres.";
const CONFIRM_PASSWORD_REQUIRED = "Confirme sua senha.";
const PASSWORDS_MISMATCH = "As senhas não conferem.";
const CODE_LENGTH = "O código precisa ter 6 dígitos.";

export const SIGN_IN_VALIDATION: SignInValidation = {
  invalidEmail: INVALID_EMAIL,
  passwordRequired: "Digite sua senha.",
};

export const SIGN_UP_VALIDATION: SignUpValidation = {
  nameRequired: "Digite seu nome.",
  invalidEmail: INVALID_EMAIL,
  passwordTooShort: PASSWORD_TOO_SHORT,
  passwordTooLong: PASSWORD_TOO_LONG,
  confirmPasswordRequired: CONFIRM_PASSWORD_REQUIRED,
  passwordsMismatch: PASSWORDS_MISMATCH,
};

export const FORGOT_PASSWORD_VALIDATION: ForgotPasswordValidation = {
  invalidEmail: INVALID_EMAIL,
};

export const RESET_PASSWORD_VALIDATION: ResetPasswordValidation = {
  passwordTooShort: PASSWORD_TOO_SHORT,
  passwordTooLong: PASSWORD_TOO_LONG,
  confirmPasswordRequired: CONFIRM_PASSWORD_REQUIRED,
  passwordsMismatch: PASSWORDS_MISMATCH,
};

export const TWO_FACTOR_VALIDATION: TwoFactorValidation = {
  codeLength: CODE_LENGTH,
};

export const VERIFY_EMAIL_OTP_VALIDATION: VerifyEmailOtpValidation = {
  codeLength: CODE_LENGTH,
};
