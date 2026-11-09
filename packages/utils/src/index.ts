export * from "./constants.js";

const ISO_DATE_LENGTH = 10;

export const formatDate = (date: Date): string => {
  return date.toISOString().slice(0, ISO_DATE_LENGTH);
};

export const countDigits = (value: string): number =>
  value.replace(/\D/g, "").length;

export const applyPhoneMask = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

export const applyCnpjMask = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 14);

  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;

  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
};
