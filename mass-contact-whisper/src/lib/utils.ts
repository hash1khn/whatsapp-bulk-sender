import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Generate a unique ID for contacts
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// Format phone number for WhatsApp
export function formatWhatsAppNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // If it starts with 0, replace with country code (assuming +1 for US/Canada)
  if (cleaned.startsWith('0')) {
    return '+1' + cleaned.substring(1);
  }
  
  // If it doesn't start with +, add it
  if (!cleaned.startsWith('+')) {
    return '+' + cleaned;
  }
  
  return cleaned;
}

// Validate WhatsApp number format
export function isValidWhatsAppNumber(phoneNumber: string): boolean {
  const formatted = formatWhatsAppNumber(phoneNumber);
  // Basic validation: should start with + and have 10-15 digits
  return /^\+\d{10,15}$/.test(formatted);
}
