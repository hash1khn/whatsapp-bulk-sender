// Configuration for API keys and other sensitive data
export const CONFIG = {
  // API Key - stored in localStorage for security
  WASSENDER_API_KEY: '8596a054e2dfef4a13bdb1c6a22cbdccadd2c7cba4415283dbe8477241e32ebb',
  
  // API Base URL
  WASSENDER_API_BASE: 'https://wasenderapi.com/api',
  
  // Local Storage Keys
  STORAGE_KEYS: {
    API_KEY: 'WASSENDER_API_KEY',
    CONTACTS: 'WASSENDER_CONTACTS',
    SETTINGS: 'WASSENDER_SETTINGS',
  },
} as const;

// Initialize API key in localStorage if not already present
export function initializeApiKey(): void {
  const existingKey = localStorage.getItem(CONFIG.STORAGE_KEYS.API_KEY);
  if (!existingKey) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.API_KEY, CONFIG.WASSENDER_API_KEY);
  }
}

// Get API key from localStorage
export function getApiKey(): string | null {
  return localStorage.getItem(CONFIG.STORAGE_KEYS.API_KEY);
}

// Set API key in localStorage
export function setApiKey(apiKey: string): void {
  localStorage.setItem(CONFIG.STORAGE_KEYS.API_KEY, apiKey);
}

// Remove API key from localStorage
export function removeApiKey(): void {
  localStorage.removeItem(CONFIG.STORAGE_KEYS.API_KEY);
} 