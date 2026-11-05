import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalizes any Indian mobile number string to exactly 10 digits without +91 or leading 0s.
 * Examples:
 *  '+91 98765 43210' -> '9876543210'
 *  '919876543210'    -> '9876543210'
 *  '09876543210'     -> '9876543210'
 *  '9876543210'      -> '9876543210'
 */
export function normalizePhone10(phone?: string | null): string {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  if (digits.length > 10) {
    return digits.slice(-10);
  }
  return digits;
}

/**
 * Formats a 10-digit number for clean display with +91
 * e.g., '9876543210' -> '+91 98765 43210'
 */
export function formatPhoneWithCountryCode(phone?: string | null): string {
  const p10 = normalizePhone10(phone);
  if (!p10) return '';
  if (p10.length === 10) {
    return `+91 ${p10.slice(0, 5)} ${p10.slice(5)}`;
  }
  return `+91 ${p10}`;
}
