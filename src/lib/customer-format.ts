export function formatCustomerPhone(value: string): string {
  const digits = value.replace(/\D/g, "").replace(/^55/, "").slice(0, 11);

  if (digits.length === 0) {
    return "";
  }

  if (digits.length <= 2) {
    return `+55 (${digits}`;
  }

  if (digits.length <= 6) {
    return `+55 (${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    return `+55 (${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `+55 (${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function isValidCustomerPhone(value: string): boolean {
  if (!value.trim()) {
    return false;
  }

  return /^\+55 \(\d{2}\) \d{4,5}-\d{4}$/.test(value);
}

export function isValidCustomerEmail(value: string): boolean {
  if (!value.trim()) {
    return false;
  }

  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value);
}
