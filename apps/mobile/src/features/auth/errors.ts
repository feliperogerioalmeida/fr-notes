const AUTH_ERROR_MESSAGES: Record<string, string> = {
  INVALID_EMAIL: "Digite um e-mail válido.",
  INVALID_EMAIL_OR_PASSWORD: "E-mail ou senha incorretos.",
  INVALID_PASSWORD: "Senha incorreta.",
  USER_ALREADY_EXISTS: "Já existe uma conta com este e-mail. Faça login.",
  USER_NOT_FOUND: "Não encontramos uma conta com este e-mail.",
  EMAIL_NOT_VERIFIED: "Confirme seu e-mail antes de entrar.",
  INVALID_OTP: "Código inválido. Confira e tente de novo.",
  OTP_EXPIRED: "O código expirou. Peça um novo.",
  TOO_MANY_ATTEMPTS: "Muitas tentativas. Aguarde um pouco e tente de novo.",
  PASSWORD_TOO_SHORT: "A senha precisa ter pelo menos 8 caracteres.",
  PASSWORD_COMPROMISED:
    "Esta senha apareceu em vazamentos conhecidos. Escolha outra.",
};

const FALLBACK_ERROR_MESSAGE = "Algo deu errado. Tente novamente.";

interface AuthResult {
  error?: { message?: string; code?: string } | null;
}

export const throwIfAuthError = (result: AuthResult) => {
  if (!result.error) return;

  const translated = result.error.code
    ? AUTH_ERROR_MESSAGES[result.error.code]
    : undefined;

  throw new Error(translated ?? result.error.message ?? FALLBACK_ERROR_MESSAGE);
};

export const readErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : FALLBACK_ERROR_MESSAGE;
