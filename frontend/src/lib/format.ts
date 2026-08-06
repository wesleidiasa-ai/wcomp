export function formatCnpj(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  let result = digits.slice(0, 2);
  if (digits.length > 2) result += "." + digits.slice(2, 5);
  if (digits.length > 5) result += "." + digits.slice(5, 8);
  if (digits.length > 8) result += "/" + digits.slice(8, 12);
  if (digits.length > 12) result += "-" + digits.slice(12, 14);
  return result;
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";

  let result = "(" + digits.slice(0, 2);
  if (digits.length > 2) {
    result += ") ";
    const isMobile = digits.length > 10;
    const splitAt = isMobile ? 7 : 6;
    result += digits.slice(2, splitAt);
    if (digits.length > splitAt) result += "-" + digits.slice(splitAt, isMobile ? 11 : 10);
  }
  return result;
}
