export interface SignInValidation {
  invalidEmail: string;
  passwordRequired: string;
}

export interface SignUpValidation {
  nameRequired: string;
  invalidEmail: string;
  passwordTooShort: string;
  passwordTooLong: string;
  confirmPasswordRequired: string;
  passwordsMismatch: string;
}

export interface ForgotPasswordValidation {
  invalidEmail: string;
}

export interface ResetPasswordValidation {
  passwordTooShort: string;
  passwordTooLong: string;
  confirmPasswordRequired: string;
  passwordsMismatch: string;
}

export interface TwoFactorValidation {
  codeLength: string;
}

export interface VerifyEmailOtpValidation {
  codeLength: string;
}

export interface SignInFormLabels {
  title: string;
  description: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  submitButton: string;
  submittingButton: string;
  forgotPasswordLink: string;
  signUpText: string;
  signUpLink: string;
  validation: SignInValidation;
}

export interface SignUpFormLabels {
  title: string;
  description: string;
  nameLabel: string;
  namePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  confirmPasswordLabel: string;
  confirmPasswordPlaceholder: string;
  submitButton: string;
  submittingButton: string;
  signInText: string;
  signInLink: string;
  validation: SignUpValidation;
}

export interface ForgotPasswordFormLabels {
  title: string;
  description: string;
  emailLabel: string;
  emailPlaceholder: string;
  submitButton: string;
  submittingButton: string;
  successTitle: string;
  successDescription: string;
  backToSignInLink: string;
  validation: ForgotPasswordValidation;
}

export interface ResetPasswordFormLabels {
  title: string;
  description: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  confirmPasswordLabel: string;
  confirmPasswordPlaceholder: string;
  submitButton: string;
  submittingButton: string;
  backToSignInLink: string;
  validation: ResetPasswordValidation;
}

export interface VerifyEmailOtpFormLabels {
  title: string;
  description: string;
  codeLabel: string;
  submitButton: string;
  submittingButton: string;
  successTitle: string;
  successDescription: string;
  resendButton: string;
  resendCooldown: string;
  resentToast: string;
  backToSignInLink: string;
  validation: VerifyEmailOtpValidation;
}

export interface TwoFactorFormLabels {
  title: string;
  description: string;
  codeLabel: string;
  submitButton: string;
  submittingButton: string;
  backToSignInLink: string;
  validation: TwoFactorValidation;
}

export interface SignInFormProps {
  labels: SignInFormLabels;
  forgotPasswordHref: string;
  signUpHref: string;
  successRedirect?: string;
  twoFactorRedirect?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export interface SignUpFormProps {
  labels: SignUpFormLabels;
  signInHref: string;
  successRedirect?: string;
  onSuccess?: (email: string) => void;
  onError?: (error: string) => void;
}

export interface ForgotPasswordFormProps {
  labels: ForgotPasswordFormLabels;
  signInHref: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export interface ResetPasswordFormProps {
  labels: ResetPasswordFormLabels;
  token: string;
  signInHref: string;
  successRedirect?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export interface VerifyEmailOtpFormProps {
  labels: VerifyEmailOtpFormLabels;
  email: string;
  signInHref: string;
  successRedirect?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export interface TwoFactorFormProps {
  labels: TwoFactorFormLabels;
  signInHref: string;
  successRedirect?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export interface AuthDictionary {
  signIn: SignInFormLabels;
  signUp: SignUpFormLabels;
  forgotPassword: ForgotPasswordFormLabels;
  resetPassword: ResetPasswordFormLabels;
  verifyEmailOtp: VerifyEmailOtpFormLabels;
  twoFactor: TwoFactorFormLabels;
}
